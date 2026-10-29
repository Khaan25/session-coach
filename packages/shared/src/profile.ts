import { z } from "zod";

/** True for a time zone name the runtime knows (IANA), e.g. "Asia/Karachi" or "UTC". */
function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value.length > 0;
  } catch {
    return false;
  }
}

/** A learner's profile row. One per auth user, created by the `handle_new_user` trigger. */
export const profileSchema = z.object({
  id: z.uuid(),
  /** Copied from auth.users and kept in sync by a trigger; learners can't write it. */
  email: z.string().nullable(),
  /** From the provider's name at sign-up, or what the learner set. Trimmed, 1–100 characters. */
  display_name: z.string().trim().min(1).max(100).nullable(),
  /** Provider avatar (Google, GitHub), https only. Server-managed. */
  avatar_url: z.url({ protocol: /^https$/ }).nullable(),
  /** IANA time zone, so "due today" means the learner's today. */
  timezone: z.string().refine(isTimeZone, "must be an IANA time zone, e.g. Asia/Karachi"),
  /** Whether to send lesson-ready and daily-review emails. */
  notify_email: z.boolean(),
  created_at: z.iso.datetime({ offset: true }),
});

/** The only columns a learner may change (column grants in the migrations). Send null to clear the name, never "". */
export const profileUpdateSchema = profileSchema
  .pick({ display_name: true, timezone: true, notify_email: true })
  .partial();

export type Profile = z.infer<typeof profileSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
