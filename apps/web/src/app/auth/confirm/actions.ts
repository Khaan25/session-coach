"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { safeNext } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function isOtpType(value: unknown): value is EmailOtpType {
  return OTP_TYPES.includes(value as EmailOtpType);
}

/**
 * Spends the email link's one-time token (`verifyOtp`), which signs the learner in, then goes to `next` when it stays
 * on this origin. A POST from the confirm page's button, so link scanners that open the GET can't spend it (#8).
 */
export async function confirmEmail(formData: FormData): Promise<void> {
  const tokenHash = formData.get("token_hash");
  const type = formData.get("type");
  if (typeof tokenHash !== "string" || !tokenHash || !isOtpType(type))
    redirect("/auth/error?code=invalid_link");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    if (error.code !== "otp_expired") console.error("auth/confirmEmail", error);
    redirect(
      `/auth/error?code=${error.code === "otp_expired" ? "link_expired" : "confirm_failed"}`,
    );
  }

  // Next.js runs a Server Action only when Origin matches the host, so this is this deployment's origin.
  const origin = (await headers()).get("origin");
  const next = formData.get("next");
  redirect(origin ? safeNext(typeof next === "string" ? next : null, origin) : "/dashboard");
}
