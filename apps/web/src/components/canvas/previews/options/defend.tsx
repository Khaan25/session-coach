"use client";

// The picked Defend it, option C: the real steps from components/defend/defend-flow.tsx (DefendStart, DefendTimed,
// DefendResult, NothingToDefend) in the real column, fed synthetic data. The buttons move the stage on; nothing calls
// the routes, and the clock holds still. The answer key never appears: a result shows the score and what was missing.

import { useState } from "react";

import { Container } from "@/components/app/container";
import {
  DefendColumn,
  DefendResult,
  DefendStart,
  DefendTimed,
  NothingToDefend,
  type DefendCard,
  type Graded,
  type TimeUpReason,
} from "@/components/defend/defend-flow";

import { AppFrame } from "../frames";

export type DefendStage =
  | "empty"
  | "start"
  | "answer"
  | "follow-up"
  | "result"
  | "not-defended"
  | "time-up";

const CARD: DefendCard = {
  decision: "Rate limit uploads per CLI token, not per IP",
  sessionName: "Add rate limiting to the upload route",
  repo: "session-coach",
};
const QUESTION =
  "Why key the upload limit on the token? What breaks if you key it on the IP instead?";
const FOLLOW_UP =
  "You said a shared office IP would block everyone. The session also mentions retries from the CLI. How does the token key stop one learner's retries from hurting another?";
const RESULTS: Record<"result" | "not-defended", Graded> = {
  result: {
    score: 2,
    missing: "Nothing. You tied the retries to the token and said why an IP is shared.",
    label: "defended (timed, follow-up)",
  },
  "not-defended": {
    score: 1,
    missing:
      "Why an IP is the wrong key: learners behind one office IP would block each other's uploads.",
    label: "defended (timed, follow-up)",
  },
};

export function DefendOptionC({
  stage: initial = "start",
  error,
  reason = "empty",
}: {
  stage?: DefendStage;
  /** Why the defense didn't start, under the Start button, as the real flow shows it. */
  error?: string;
  /** Why the time ran out, for the time-up stage. */
  reason?: TimeUpReason;
}) {
  const [stage, setStage] = useState(initial);
  const [answer, setAnswer] = useState("");
  const timed = stage === "answer" || stage === "follow-up";
  return (
    <AppFrame path="/defend">
      <Container>
        <DefendColumn>
          {stage === "empty" && <NothingToDefend />}
          {stage === "start" && (
            <DefendStart defendable={9} error={error} onStart={() => setStage("answer")} />
          )}
          {timed && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setAnswer("");
                setStage(stage === "answer" ? "follow-up" : "result");
              }}
              noValidate
            >
              <DefendTimed
                key={stage}
                followUp={stage === "follow-up"}
                card={CARD}
                question={stage === "follow-up" ? FOLLOW_UP : QUESTION}
                left={stage === "follow-up" ? 120 : 180}
                total={stage === "follow-up" ? 120 : 180}
                answer={answer}
                onAnswerChange={setAnswer}
              />
            </form>
          )}
          {(stage === "result" || stage === "not-defended" || stage === "time-up") && (
            <DefendResult
              result={stage === "time-up" ? null : RESULTS[stage]}
              card={CARD}
              reason={reason}
              onAgain={() => setStage("start")}
            />
          )}
        </DefendColumn>
      </Container>
    </AppFrame>
  );
}
