"use server";

import { profileUpdateSchema } from "@session-coach/shared/profile";
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { saveProjectLevel } from "@/lib/projects/save";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Saves the learner's display name, time zone and email reminders: the only profile columns they may write (column
 * grants). Goes through the RLS client, so it can only touch their own row.
 *
 * @param input - Any of display_name (null clears it, never ""), timezone and notify_email.
 * @returns `{ error }` with a learner-readable message, or `{ error: null }` when saved.
 */
export async function updateProfile(input: unknown): Promise<{ error: string | null }> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") || "profile";
    return { error: `Check the ${field.replace("_", " ")} and try again.` };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "You're signed out. Sign in and try again." };

  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", userId)
    .select("id");
  if (error || !data?.length) {
    console.error("[settings/updateProfile] failed", error ?? "no row updated");
    return { error: "Your profile couldn't be saved. Try again." };
  }

  revalidatePath("/settings");
  return { error: null };
}

/**
 * Sets how hard the questions are for one of the learner's repos, from the dashboard prompt or /settings, and marks
 * the project onboarded. Applies to sessions processed from now on; existing cards keep their questions.
 *
 * @param input - `{ repo, question_level }`.
 * @returns `{ error }` with a learner-readable message, or `{ error: null }` when saved.
 */
export async function setProjectLevel(input: unknown): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "You're signed out. Sign in and try again." };

  const result = await saveProjectLevel(supabase, userId, input);
  if (!result.error) {
    revalidatePath("/settings");
    revalidatePath("/dashboard");
  }
  return result;
}

const reportOnSchema = z.object({ on: z.boolean() });
const reportRepoSchema = z.object({ repo: z.string().min(1).max(200), shown: z.boolean() });

/**
 * Turns the public report at /r/<slug> on or off. Through the RLS client: `report_on` is a column learners may update.
 *
 * @param input - `{ on }`.
 * @returns `{ error }` with a learner-readable message, or `{ error: null }` when saved.
 */
export async function setReportOn(input: unknown): Promise<{ error: string | null }> {
  const parsed = reportOnSchema.safeParse(input);
  if (!parsed.success) return { error: "Try switching it again." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "You're signed out. Sign in and try again." };

  const { data, error } = await supabase
    .from("profiles")
    .update({ report_on: parsed.data.on })
    .eq("id", userId)
    .select("id");
  if (error || !data?.length) {
    console.error("[settings/setReportOn] failed", error?.message ?? "no row updated");
    return { error: "Your report setting couldn't be saved. Try again." };
  }
  revalidatePath("/settings");
  return { error: null };
}

/**
 * Shows or hides one repo on the public report. Updates the learner's `projects` row, or inserts it the first time
 * (not an upsert: learners may update only `report_shown` and the level columns). RLS allows the insert only for a
 * repo the learner has a session in.
 *
 * @param input - `{ repo, shown }`.
 * @returns `{ error }` with a learner-readable message, or `{ error: null }` when saved.
 */
export async function setReportRepo(input: unknown): Promise<{ error: string | null }> {
  const parsed = reportRepoSchema.safeParse(input);
  if (!parsed.success) return { error: "Try ticking it again." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "You're signed out. Sign in and try again." };
  const { repo, shown } = parsed.data;

  // true when a row changed, false when there is no row, or the error's message.
  const update = async () => {
    const { data, error } = await supabase
      .from("projects")
      .update({ report_shown: shown })
      .eq("user_id", userId)
      .eq("repo", repo)
      .select("id");
    return error ? error.message : data.length > 0;
  };

  let saved = await update();
  if (saved === false) {
    const { error } = await supabase
      .from("projects")
      .insert({ user_id: userId, repo, report_shown: shown });
    if (error?.code === "42501") return { error: "That project isn't one of yours." };
    // 23505: another tab inserted it first, so update that row.
    saved = !error ? true : error.code === "23505" ? await update() : error.message;
  }
  if (saved !== true) {
    console.error("[settings/setReportRepo] failed", saved || "no row updated");
    return { error: `${repo} couldn't be saved. Try again.` };
  }
  revalidatePath("/settings");
  return { error: null };
}

/**
 * Replaces the report's slug, so every old link stops working. Written with the service role (learners can't write the
 * slug, so they can't pick a guessable one), after `getUser()` confirms who is asking.
 *
 * @returns `{ error }` with a learner-readable message, or `{ error: null }` when replaced.
 */
export async function newReportLink(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in and try again." };

  // 32 hex characters: the format the check constraint allows.
  const slug = randomUUID().replaceAll("-", "");
  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({ report_slug: slug })
    .eq("id", user.id)
    .select("id");
  if (error || !data?.length) {
    console.error("[settings/newReportLink] failed", error?.message ?? "no row updated");
    return { error: "A new link couldn't be made. Try again." };
  }
  revalidatePath("/settings");
  return { error: null };
}
