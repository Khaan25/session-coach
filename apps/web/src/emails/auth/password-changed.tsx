import { AuthEmail, AuthText } from "../auth-layout";

// Password changed notification: sent after any password change, including a reset. There's no token, so the button
// starts a reset from the site.
export default function PasswordChangedEmail() {
  return (
    <AuthEmail
      preview="If this was you, there's nothing to do."
      heading="Your password was changed"
      cta="Reset my password"
      href="{{ .SiteURL }}/forgot-password"
      footer="You get this whenever the password for {{ .Email }} changes, so you know about it."
    >
      <AuthText>The password for {"{{ .Email }}"} was just changed.</AuthText>
      <AuthText>
        {
          "If this was you, there's nothing to do. If it wasn't, reset your password now, then use Sign out everywhere in Settings."
        }
      </AuthText>
    </AuthEmail>
  );
}
