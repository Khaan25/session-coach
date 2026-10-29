import type { EmailOtpType } from "@supabase/supabase-js";

const OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

/** Whether a value is an OTP type Supabase accepts; it comes from the email link, so it is untrusted. */
export function isOtpType(value: unknown): value is EmailOtpType {
  return OTP_TYPES.includes(value as EmailOtpType);
}
