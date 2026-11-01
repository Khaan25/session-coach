import "server-only";

import { gunzipSync } from "node:zlib";
import { callModel, ModelCallError, ModelConfigError } from "@/lib/model/call-model";
import { SESSIONS_BUCKET } from "@/lib/sessions/upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkEvidence } from "./evidence.ts";
import { ExtractError, extractCards } from "./extract.ts";
import { parseSession } from "./parser.ts";
import { buildCardRows, trimTimeline } from "./process-rows.ts";

/** The session log couldn't be fetched, unzipped or found. Kept apart so the learner gets the right sentence. */
class LogReadError extends Error {
  name = "LogReadError";
}

/** The log parsed to no events: nothing to ask the model about. */
class EmptyLogError extends Error {
  name = "EmptyLogError";
}

/** A plain sentence for the learner; the real error goes to the server log. */
function learnerMessage(error: unknown): string {
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
 * `failed`, never leaving the session in `processing`.
 *
 * @param sessionId - The session to process; its log is at `raw_path` in the `sessions` bucket.
 */
export async function processSession(sessionId: string): Promise<void> {
  const started = Date.now();
  try {
    const admin = createAdminClient();

    const { data: session, error: readError } = await admin
      .from("sessions")
      .select("user_id, raw_path")
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
      raw = gunzipSync(Buffer.from(await file.arrayBuffer())).toString("utf8");
    } catch (cause) {
      throw new LogReadError("gunzip failed", { cause });
    }

    const { events } = parseSession(raw);
    if (events.length === 0) throw new EmptyLogError("parseSession returned no events");

    // The trimmed events feed both the model and the quote check, so event_index lines up.
    const { kept: timeline, cut } = trimTimeline(events);
    const drafts = await extractCards(timeline, callModel);
    const cards = checkEvidence(drafts, timeline);
    const rows = buildCardRows(cards, sessionId, session.user_id);

    // Clear earlier cards for this session so a re-run can't hit the (session_id, position) unique constraint.
    const { error: deleteError } = await admin
      .from("decision_cards")
      .delete()
      .eq("session_id", sessionId);
    if (deleteError) throw deleteError;

    // Cards first, `ready` second: a failure in between leaves `failed`, never a ready session with no cards.
    if (rows.length > 0) {
      const { error: insertError } = await admin.from("decision_cards").insert(rows);
      if (insertError) throw insertError;
    }
    const { error: readyError } = await admin
      .from("sessions")
      .update({ status: "ready", error: null })
      .eq("id", sessionId);
    if (readyError) throw readyError;

    console.log("[pipeline/process]", {
      session_id: sessionId,
      extracted: drafts.length,
      kept: rows.length,
      cut_events: cut,
      ms: Date.now() - started,
    });
  } catch (error) {
    console.error("[pipeline/process] failed", sessionId, error);
    try {
      const { error: updateError } = await createAdminClient()
        .from("sessions")
        .update({ status: "failed", error: learnerMessage(error) })
        .eq("id", sessionId);
      if (updateError) {
        console.error("[pipeline/process] status not set", sessionId, updateError.message);
      }
    } catch (updateError) {
      console.error("[pipeline/process] status not set", sessionId, updateError);
    }
  }
}
