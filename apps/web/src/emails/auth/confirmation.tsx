import { AuthEmail, AuthText } from "../auth-layout";

// Confirm signup. Built on {{ .SiteURL }}, never {{ .RedirectTo }}: a caller picks redirect_to, so a link on it could
// send the token_hash to any allow-listed host. The page verifies the token_hash with a button (docs/plans/auth.md).
export default function ConfirmationEmail() {
  return (
    <AuthEmail
      preview="One click and you're in. Confirm your email to start your first review."
      heading="Confirm your email"
      cta="Confirm email"
      href="{{ .SiteURL }}/auth/confirm?next=/dashboard&token_hash={{ .TokenHash }}&type=email"
      footer="You get this because someone signed up for Session Coach with {{ .Email }}. If it wasn't you, ignore this email; without a click the address stays unconfirmed and can't sign in."
    >
      <AuthText>
        Confirm {"{{ .Email }}"} to finish making your Session Coach account. Then push a session
        from the CLI and explain its decisions back in your own words.
      </AuthText>
    </AuthEmail>
  );
}
