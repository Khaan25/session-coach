// Known secret shapes. Each match is replaced whole.
const KEY_SHAPES = [
  // JWTs first, so one whose signature starts with "sk-" still matches as a whole token.
  // Supabase anon/service-role keys and session tokens (header.payload.signature).
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bAIza[A-Za-z0-9_-]{30,}/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/g,
  /\bBasic\s+[A-Za-z0-9+/]{16,}={0,2}/g,
];
// NAME=value where NAME mentions a secret. The value is a quoted string or a run of non-space
// characters; the name stays so the line still reads.
const SECRET_ASSIGNMENT =
  /([A-Za-z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD)[A-Za-z0-9_]*)=("[^"]*"|'[^']*'|\S+)/gi;
// Long opaque runs. Not preceded by "/" or "." so path segments and file names are left alone.
const LONG_TOKEN = /(?<![A-Za-z0-9/._-])[A-Za-z0-9+_=-]{32,}(?![A-Za-z0-9/])/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
// The username stops at a slash, whitespace, a quote or backtick, or a shell operator.
const HOME_PREFIX = /\/(?:Users|home)\/[^/\s'"`&|;<>()]+\/?/g;
// Git SHA-1 and SHA-256 are evidence, not secrets.
const GIT_SHA = /^(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/;

/** Real secrets mix letters and digits; a long all-letter word or all-digit number is not one. */
const looksSecret = (token: string): boolean =>
  /[A-Za-z]/.test(token) && /\d/.test(token) && !GIT_SHA.test(token);

/** Replaces the home directory prefix only. Used on its own for file paths. */
export function redactHomePath(text: string): string {
  return text.replace(HOME_PREFIX, "~/");
}

export function redact(text: string): string {
  let out = text;
  for (const shape of KEY_SHAPES) out = out.replace(shape, "[REDACTED]");
  out = out.replace(SECRET_ASSIGNMENT, "$1=[REDACTED]");
  out = out.replace(LONG_TOKEN, (token) => (looksSecret(token) ? "[REDACTED]" : token));
  out = out.replace(EMAIL, "[EMAIL]");
  return redactHomePath(out);
}
