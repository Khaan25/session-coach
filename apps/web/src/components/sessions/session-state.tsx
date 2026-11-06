import { CoachCompanion } from "@/components/art/coach-companion";
import { useId } from "react";
import { ProjectLink as Link } from "@/components/projects/project-link";
import { buttonVariants } from "@/components/ui/button";
const copy = {
  pending: ["Your session is waiting.", "Your decisions will appear here when it’s ready."],
  processing: [
    "Finding the decisions in your work.",
    "This page updates automatically when your decisions are ready.",
  ],
  failed: ["We couldn’t read this session.", "You can keep learning from another session."],
  empty: [
    "No decisions to review here.",
    "This session didn’t include enough supporting detail to make a review.",
  ],
} as const;
export function SessionState({
  phase,
  error,
  action,
  announce = false,
  children,
  variant = "plain",
}: {
  phase: keyof typeof copy;
  error?: string | null;
  action?: React.ReactNode;
  announce?: boolean;
  children?: React.ReactNode;
  variant?: "framed" | "plain";
}) {
  const id = useId();
  return (
    <section
      className="learning-session-state"
      data-panel-variant={variant}
      aria-labelledby={id}
      role={announce ? "alert" : undefined}
    >
      <CoachCompanion
        pose={phase === "failed" || phase === "empty" ? "reflect" : "connect"}
        size="scene"
      />
      <h2 id={id}>{copy[phase][0]}</h2>
      <p>{copy[phase][1]}</p>
      {error && <p>{error}</p>}
      {children}
      {action ?? (
        <Link href="/sessions" className={buttonVariants({ variant: "quiet" })}>
          Your other sessions →
        </Link>
      )}
    </section>
  );
}
