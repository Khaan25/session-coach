import { AppPageHeader } from "@/components/app/page-header";

/** The page title for every /cli/approve state but the question itself, which brings its own h1. */
export function ApproveHeader() {
  return (
    <AppPageHeader
      title="Connect the CLI"
      description="Check the code matches the one in your terminal, then approve."
    />
  );
}
