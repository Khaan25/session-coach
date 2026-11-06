import { ViewTransition } from "react";

import { AuthShell } from "@/components/auth/auth-screens";
import { ForgetShapes } from "@/components/auth/forget-shapes";

// Signed-out screens: one centred card (see AuthShell). Between routes the card resizes and only its content
// crossfades, with no lift or blur, so sign in and sign up swap without the frame jumping; the brand and footer hold still. ForgetShapes is not decoration: it clears an earlier build's saved skeletons on sign-out.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <ForgetShapes />
      <AuthShell>
        <ViewTransition default="auth-swap">{children}</ViewTransition>
      </AuthShell>
    </>
  );
}
