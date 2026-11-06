import {
  SAMPLE_SESSION,
  SAMPLE_SESSION_CARDS,
  SAMPLE_SESSION_NOW,
} from "@/components/sessions/session-sample";
import { SessionView } from "@/components/sessions/session-view";

/** The session page drawn from a sample session: what the loading skeleton measures, in loading.tsx and the page. */
export function SessionSampleView() {
  return (
    <SessionView session={SAMPLE_SESSION} cards={SAMPLE_SESSION_CARDS} now={SAMPLE_SESSION_NOW} />
  );
}
