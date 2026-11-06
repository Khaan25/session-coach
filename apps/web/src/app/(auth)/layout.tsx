import { ViewTransition } from "react";

import { AuthShell } from "@/components/auth/auth-screens";
import { ForgetShapes } from "@/components/auth/forget-shapes";

// Signed-out screens: one centred column (see AuthShell). Only the content crossfades between routes; the brand and
// footer hold still. ForgetShapes is not decoration: it clears an earlier build's saved skeletons on sign-out.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <ForgetShapes />
      <AuthShell>
        <ViewTransition default="route-fade">{children}</ViewTransition>
      </AuthShell>
    </>
  );
}
