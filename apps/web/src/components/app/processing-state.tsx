import type { SessionStatus } from "@session-coach/shared/session";
import { SessionState } from "@/components/sessions/session-state";
import { Progress } from "@/components/ui/progress";
export function ProcessingState({
  status,
}: {
  status: Extract<SessionStatus, "pending" | "processing">;
}) {
  return (
    <SessionState phase={status}>
      <Progress
        value={null}
        aria-label={
          status === "processing" ? "Reading your session" : "Waiting to read your session"
        }
      />
    </SessionState>
  );
}
