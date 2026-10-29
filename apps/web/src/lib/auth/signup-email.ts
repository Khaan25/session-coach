/**
 * The httpOnly cookie holding the address a sign-up used, so "check your email" can offer a resend without putting the
 * address in the URL. Scoped to /sign-up and kept for an hour.
 */
export const SIGNUP_EMAIL_COOKIE = "sc_signup_email";
