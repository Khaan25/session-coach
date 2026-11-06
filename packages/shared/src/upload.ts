import { z } from "zod";

// The body of POST /api/sessions, shared by the CLI and the web app. Its limits are in limits.ts, which has no zod, so
// the CLI can import them at runtime without bundling zod.

/**
 * Metadata for one session. The log itself goes straight to Storage through the signed URL this returns, so a big
 * log never passes through a Vercel function (4.5 MB body limit).
 */
export const uploadRequestSchema = z.object({
  /** Claude Code's session_id. It becomes part of a Storage path, so only safe characters. */
  external_id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  agent: z.enum(["claude-code", "codex"]).default("claude-code"),
  title: z.string().trim().max(200).nullish(),
  repo: z.string().trim().max(200).nullish(),
  branch: z.string().trim().max(200).nullish(),
  started_at: z.iso.datetime({ offset: true }).nullish(),
  duration_min: z.number().int().min(0).nullish(),
  event_count: z.number().int().min(0).nullish(),
  /** Size of the .jsonl.gz the CLI will upload. Over the limit answers 413 before a row is made. */
  size_bytes: z.number().int().positive(),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;
/** What a client may send, before defaults: the CLI's metadata type, imported type-only so zod stays out of its bundle. */
export type UploadRequestInput = z.input<typeof uploadRequestSchema>;
