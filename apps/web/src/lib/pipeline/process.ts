import "server-only";

import { DEFAULT_QUESTION_LEVEL } from "@session-coach/shared/project";

import { callModel, ModelCallError, ModelConfigError } from "@/lib/model/call-model";
import { levelOrDefault } from "@/lib/projects/level";
import { SESSIONS_BUCKET } from "@/lib/sessions/upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkEvidence } from "./evidence.ts";
import { ExtractError, extractCards } from "./extract.ts";
import { parseSession } from "./parser.ts";
import {
  buildCardRows,
  durationMinutes,
  LogTooBigError,
  MAX_LOG_BYTES,
  sessionTitle,
  trimTimeline,
  unzipLog,
} from "./process-rows.ts";

/** The session log couldn't be fetched, unzipped or found. Kept apart so the learner gets the right sentence. */
class LogReadError extends Error {
  name = "LogReadError";
}

/** Processing ran past `DEADLINE_MS`. */
class DeadlineError extends Error {
  name = "DeadlineError";
}

/**
 * 20 s under the route's 300 s `maxDuration`, counted from the route's start, so the catch can still write `failed`
 * before the platform kills the function.
 */
const DEADLINE_MS = 280_000;

/** The log parsed to no events: nothing to ask the model about. */
class EmptyLogError extends Error {
  name = "EmptyLogError";
}

/** A plain sentence for the learner; the real error goes to the server log. */
function learnerMessage(error: unknown): string {
  if (error instanceof LogTooBigError) {
    return `This session's log unzips to over ${MAX_LOG_BYTES / 1024 / 1024} MB, too big to read.`;
  }
  if (error instanceof DeadlineError) return "Making your cards took too long, so we stopped.";
  if (error instanceof EmptyLogError) return "We couldn't find a conversation in this log.";
  if (error instanceof LogReadError) return "We couldn't read this session's log.";
  if (error instanceof ModelConfigError) return "Cards aren't set up on our side yet.";
  if (error instanceof ExtractError) {
    return "The model's answer didn't fit twice, so no cards were made.";
  }
  if (error instanceof ModelCallError) return "The model didn't answer.";
  return "Something went wrong while making your cards.";
}

/**
 * Turns one uploaded session into decision cards. POST /api/sessions/[id]/process calls it inside `after()`, once it
 * has moved the session from `pending` to `processing`, so this starts at `processing` and must end at `ready` or
 * `failed`, never leaving the session in `processing`. A run past `DEADLINE_MS` is marked failed too, before the
 * platform kills the function.
 *
 * @param sessionId - The session to process; its log is at `raw_path` in the `sessions` bucket.
 * @param startedAt - The `processing_started_at` the route claimed with. The final status write matches it, so a run
 *   that a re-push replaced can't mark the newer run failed or ready.
 * @param invokedAt - When the route started (`Date.now()`); its own work spends the same 300 s.
 */
export async function processSession(
  sessionId: string,
  startedAt: string,
  invokedAt: number,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  // On the deadline the run's model calls are cancelled, and it checks before each write.
  const stop = new AbortController();
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => {
        stop.abort();
        reject(new DeadlineError(`over ${DEADLINE_MS} ms`));
      },
      DEADLINE_MS - (Date.now() - invokedAt),
    );
  });
  try {
    await Promise.race([run(sessionId, startedAt, stop.signal), deadline]);
  } catch (error) {
    console.error("[pipeline/process] failed", sessionId, error);
    try {
      const { error: updateError } = await createAdminClient()
        .from("sessions")
        .update({ status: "failed", error: learnerMessage(error) })
        .eq("id", sessionId)
        .eq("status", "processing")
        .eq("processing_started_at", startedAt);
      if (updateError) {
        console.error("[pipeline/process] status not set", sessionId, updateError.message);
      }
    } catch (updateError) {
      console.error("[pipeline/process] status not set", sessionId, updateError);
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The work of `processSession`: every failure throws, and `processSession` marks the session failed.
 *
 * @param signal - Aborted at the deadline; no write happens after that.
 */
async function run(sessionId: string, startedAt: string, signal: AbortSignal): Promise<void> {
  const started = Date.now();
  const admin = createAdminClient();

  const { data: session, error: readError } = await admin
    .from("sessions")
    .select("user_id, raw_path, title, repo")
    .eq("id", sessionId)
    .single();
  if (readError || !session?.raw_path) {
    throw new LogReadError("session row or raw_path missing", { cause: readError });
  }

  const { data: file, error: downloadError } = await admin.storage
    .from(SESSIONS_BUCKET)
    .download(session.raw_path);
  if (downloadError || !file) {
    throw new LogReadError("download failed", { cause: downloadError });
  }
  let raw: string;
  try {
    raw = unzipLog(Buffer.from(await file.arrayBuffer()));
  } catch (cause) {
    if (cause instanceof LogTooBigError) throw cause;
    throw new LogReadError("gunzip failed", { cause });
  }

  const { events } = parseSession(raw);
  if (events.length === 0) throw new EmptyLogError("parseSession returned no events");

  // The trimmed events feed both the model and the quote check, so event_index lines up.
  const { kept: timeline, cut } = trimTimeline(events);
  const level = await questionLevel(admin, session.user_id, session.repo);
  const { cards: drafts, title: modelTitle } = await extractCards(timeline, callModel, {
    signal,
    level,
  });
  const cards = checkEvidence(drafts, timeline);
  const rows = buildCardRows(cards, sessionId, session.user_id);

  // Cards first, `ready` second: a failure in between leaves `failed`, never a ready session with no cards.
  // shortcut: the insert isn't fenced by `startedAt`; a run replaced mid-insert can leave stale cards, and the newer run
  // then fails on the (session_id, position) key until the next push clears them. Move insert and ready into one RPC
  // if that is ever seen.
  signal.throwIfAborted();
  if (rows.length > 0) {
    const { error: insertError } = await admin.from("decision_cards").insert(rows);
    if (insertError) throw insertError;
  }

  // Title and duration are optional: if computing them throws, the session is still marked ready.
  let extras: { title?: string; duration_min?: number } = {};
  try {
    const title = session.title ? null : (modelTitle ?? sessionTitle(events));
    const duration = durationMinutes(raw);
    extras = {
      ...(title !== null && { title }),
      ...(duration !== null && { duration_min: duration }),
    };
  } catch (error) {
    console.error("[pipeline/process] title and duration skipped", sessionId, error);
  }
  signal.throwIfAborted();
  const { data: readied, error: readyError } = await admin
    .from("sessions")
    .update({ status: "ready", error: null, ...extras })
    .eq("id", sessionId)
    .eq("status", "processing")
    .eq("processing_started_at", startedAt)
    .select("id");
  if (readyError) throw readyError;
  if (readied.length === 0) throw new Error("session left processing before the run finished");

  console.log("[pipeline/process]", {
    session_id: sessionId,
    level,
    extracted: drafts.length,
    kept: rows.length,
    cut_events: cut,
    title_set: extras.title !== undefined,
    duration_min: extras.duration_min ?? null,
    ms: Date.now() - started,
  });
}

/**
 * The question level of the session's project (learner + repo). A session with no repo, no project row, or a failed
 * read gets the default: the level only shapes the questions, so it never fails the run.
 */
async function questionLevel(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  repo: string | null,
) {
  if (!repo) return DEFAULT_QUESTION_LEVEL;
  const { data, error } = await admin
    .from("projects")
    .select("question_level")
    .eq("user_id", userId)
    .eq("repo", repo)
    .maybeSingle();
  if (error) console.error("[pipeline/process] question level read failed", error.message);
  return levelOrDefault(data?.question_level);
}
