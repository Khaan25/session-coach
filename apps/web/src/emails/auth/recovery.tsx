import { AuthEmail, AuthText } from "../auth-layout";

// Reset password. On {{ .SiteURL }} for the reason in confirmation.tsx.
export default function RecoveryEmail() {
  return (
    <AuthEmail
      preview="Choose a new password for your Session Coach account."
      heading="Reset your password"
      cta="Choose a new password"
      href="{{ .SiteURL }}/auth/confirm?next=/update-password&token_hash={{ .TokenHash }}&type=recovery"
      footer="You get this because someone asked to reset the password for {{ .Email }}. If it wasn't you, ignore this email; your password stays the same."
    >
      <AuthText>
        Use the button below to choose a new password for {"{{ .Email }}"}. The link works once.
      </AuthText>
    </AuthEmail>
  );
}
