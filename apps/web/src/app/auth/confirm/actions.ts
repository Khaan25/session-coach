"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isOtpType } from "@/lib/auth/otp";
import { safeNext } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";

/**
 * Spends the email link's one-time token (`verifyOtp`), which signs the learner in, then goes to `next` when it stays
 * on this origin. A POST from the confirm page's button, so link scanners that open the GET can't spend it (#8).
 * `token_hash` needs no PKCE cookie, so a link opened in another browser or on a phone still works (#9).
 *
 * @param formData - Hidden fields `token_hash`, `type` and `next`, copied from the email link's query.
 */
export async function confirmEmail(formData: FormData): Promise<void> {
  const tokenHash = formData.get("token_hash");
  const type = formData.get("type");
  if (typeof tokenHash !== "string" || !tokenHash || !isOtpType(type))
    redirect("/auth/error?code=invalid_link");

  // Checked before the token is spent, like the other auth actions: without it `next` can't be checked.
  const origin = (await headers()).get("origin");
  if (!origin) {
    console.error("auth/confirmEmail", "missing Origin header");
    redirect("/auth/error?code=confirm_failed");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    if (error.code !== "otp_expired") console.error("auth/confirmEmail", error);
    redirect(
      `/auth/error?code=${error.code === "otp_expired" ? "link_expired" : "confirm_failed"}`,
    );
  }

  const next = formData.get("next");
  redirect(safeNext(typeof next === "string" ? next : null, origin));
}
