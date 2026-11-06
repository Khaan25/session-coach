import { AuthHeading } from "@/components/auth/auth-parts";

/** The page title for every /cli/approve state but the question itself, which brings its own h1. */
export function ApproveHeader() {
  return (
    <AuthHeading title="Connect the CLI">
      Check the code matches the one in your terminal, then approve.
    </AuthHeading>
  );
}
