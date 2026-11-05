import { RouteAuthArt } from "@/components/auth/auth-art";
import { AuthShell } from "@/components/auth/auth-screens";
import { ForgetShapes } from "@/components/auth/forget-shapes";

// Signed-out screens: the form column and the route's art (see AuthShell).
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <ForgetShapes />
      <AuthShell art={<RouteAuthArt />}>{children}</AuthShell>
    </>
  );
}
