import { z } from "zod";

/** pending (uploaded) -> processing (pipeline running) -> ready | failed. Written by the server only. */
export const sessionStatusSchema = z.enum(["pending", "processing", "ready", "failed"]);

export const sessionSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  /** Claude Code's own session_id; unique per user so a repeat upload returns 409. */
  external_id: z.string().min(1),
  agent: z.enum(["claude-code", "codex"]),
  /** From the log's ai-title line, when present. */
  title: z.string().nullable(),
  /** From the log's cwd. */
  repo: z.string().nullable(),
  /** From the log's gitBranch. */
  branch: z.string().nullable(),
  started_at: z.iso.datetime({ offset: true }).nullable(),
  duration_min: z.number().int().min(0).nullable(),
  event_count: z.number().int().min(0).nullable(),
  /** Storage path of the redacted .jsonl.gz. */
  raw_path: z.string(),
  status: sessionStatusSchema,
  /** Shown to the user when status is failed. */
  error: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
});

export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type Session = z.infer<typeof sessionSchema>;
