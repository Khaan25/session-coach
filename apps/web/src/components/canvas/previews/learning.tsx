"use client";

// The daily loop: dashboard, a session's cards, and the answer-first review.

import { FireIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";

import {
  AllCaughtUpEmpty,
  NoCardsYetEmpty,
  NoReviewsEmpty,
  NoSessionsEmpty,
} from "@/components/app/empty-state";
import {
  ErrorState,
  LoadFailedState,
  OfflineState,
  SessionFailedState,
} from "@/components/app/error-state";
import {
  ProcessingState,
  ReviewCardLoading,
  SessionListLoading,
  StatRowLoading,
} from "@/components/app/loading-state";
import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { SessionRow } from "@/components/app/session-row";
import { StatRow } from "@/components/app/stat-row";
import { cards, session } from "@/components/design-system/sample";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { IdeaNote, NOW, Screen } from "./parts";

const SESSIONS = [
  {
    ...session,
    id: "s1",
    title: "Add rate limiting to the upload route",
    repo: "session-coach",
    status: "ready" as const,
    created_at: "2026-11-02T18:10:00Z",
  },
  {
    ...session,
    id: "s2",
    title: "Write transcriptParser.ts",
    repo: "rapporteur",
    status: "processing" as const,
    created_at: "2026-11-03T08:40:00Z",
  },
  {
    ...session,
    id: "s3",
    title: "Move email to Resend",
    repo: "session-coach",
    status: "failed" as const,
    error: "The log was empty after redaction.",
    created_at: "2026-11-01T12:00:00Z",
  },
];

const REPOS = [
  { repo: "session-coach", owned: 12, total: 30 },
  { repo: "rapporteur", owned: 5, total: 9 },
];

/** Seven days, newest last. A missed day is grey but never resets the count. */
const WEEK = [true, true, false, true, true, true, false];

export function DashboardPreview({
  state,
}: {
  state: "loading" | "empty" | "full" | "error" | "offline";
}) {
  const retry = <Button variant="secondary">Try again</Button>;
  return (
    <Screen path="/dashboard">
      <span className="type-heading">Dashboard</span>
      {state === "loading" && (
        <>
          <StatRowLoading />
          <SessionListLoading rows={3} />
        </>
      )}
      {state === "empty" && <NoSessionsEmpty />}
      {state === "error" && <LoadFailedState noun="your sessions" code="ERR-7F3A" action={retry} />}
      {state === "offline" && <OfflineState noun="your sessions" action={retry} />}
      {state === "full" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>You own 17 of 39 decisions</CardTitle>
              <CardDescription>
                Up 2 this week. Owned means you explained it right on day 7.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {REPOS.map(({ repo, owned, total }) => (
                  <Progress key={repo} value={Math.round((owned / total) * 100)}>
                    <ProgressLabel>{repo}</ProgressLabel>
                    <ProgressValue>{() => `${owned} of ${total}`}</ProgressValue>
                  </Progress>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="flex items-center justify-between gap-3 rounded-soft border border-hair p-4">
            <div className="flex items-center gap-2">
              <FireIcon aria-hidden="true" />
              <span className="type-label">5 of the last 7 days</span>
            </div>
            <div className="flex gap-1" aria-label="Last 7 days: 5 practised">
              {WEEK.map((done, i) => (
                <span
                  key={i}
                  className={`size-3 rounded-full ${done ? "bg-accent-line" : "bg-cell-quiet"}`}
                />
              ))}
            </div>
          </div>
          <StatRow cardsDueToday={3} sessionsThisWeek={4} explainedPercent={64} />
          <div className="flex flex-col">
            {SESSIONS.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                cardCount={s.status === "ready" ? 4 : undefined}
                now={NOW}
              />
            ))}
          </div>
          <IdeaNote>
            Meter: reviews.mastered grouped by sessions.repo, no new table. Streak counts days with
            an answer in the last 7, so one missed day costs nothing.
          </IdeaNote>
        </>
      )}
    </Screen>
  );
}

export function SessionPreview({
  state,
}: {
  state: "processing" | "ready" | "failed" | "no-cards";
}) {
  return (
    <Screen path="/s/[id]">
      <div className="flex flex-col gap-1">
        <span className="type-heading">Add rate limiting to the upload route</span>
        <span className="type-body-sm text-text-2">session-coach · main · 42 min · 412 events</span>
      </div>
      {state === "processing" && <ProcessingState status="processing" />}
      {state === "failed" && (
        <SessionFailedState
          error="The log was empty after redaction."
          action={<Button variant="secondary">How to push again</Button>}
        />
      )}
      {state === "no-cards" && <NoCardsYetEmpty cardless={{ reason: "no-cards" }} />}
      {state === "ready" && (
        <>
          {cards.slice(0, 2).map((card, i) => (
            <Card key={card.id}>
              <CardHeader>
                <CardTitle>{card.decision}</CardTitle>
                <CardDescription>{card.files.join(", ")}</CardDescription>
              </CardHeader>
              <CardContent>
                <DataList>
                  <DataListItem>
                    <DataListLabel>Why</DataListLabel>
                    <DataListValue>
                      {i === 0 ? (
                        card.why
                      ) : (
                        <span className="flex items-center gap-2 text-text-3">
                          <LockSimpleIcon aria-hidden="true" />
                          Explain it first. The why loads after you answer.
                        </span>
                      )}
                    </DataListValue>
                  </DataListItem>
                  <DataListItem>
                    <DataListLabel>Evidence</DataListLabel>
                    <DataListValue>&ldquo;{card.evidence[0].quote}&rdquo;</DataListValue>
                  </DataListItem>
                </DataList>
              </CardContent>
              <CardFooter>
                <div className="flex gap-2">
                  {i === 0 ? (
                    <Badge variant="success">Day 3 · level 2</Badge>
                  ) : (
                    <Button>Explain it back</Button>
                  )}
                  <Button variant="ghost">Not important</Button>
                </div>
              </CardFooter>
            </Card>
          ))}
          <IdeaNote>
            The server sends `why` only for cards the learner has answered. Unanswered cards never
            carry it, so it can&rsquo;t be read from the page source or the network tab.
          </IdeaNote>
        </>
      )}
    </Screen>
  );
}

const CARD = cards[1];

/** The answer-first quiz. Interactive: type, submit, or tap "I don't know yet". Nothing is sent anywhere. */
export function ReviewAnswerPreview() {
  const [answer, setAnswer] = useState("");
  return (
    <Screen path="/review/[cardId]">
      <div className="flex items-center justify-between gap-3">
        <span className="type-label text-text-2">Card 2 of 5 today</span>
        <Badge variant="outline">Day 1</Badge>
      </div>
      <span className="type-heading">{CARD.decision.replace("SAMPLE: ", "")}</span>
      <Card>
        <CardHeader>
          <CardTitle>{CARD.question}</CardTitle>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="canvas-review-answer">Your explanation</FieldLabel>
            <Textarea
              id="canvas-review-answer"
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <FieldDescription>
              In your own words. Asking an AI to help you understand is fine here.
            </FieldDescription>
          </Field>
        </CardContent>
        <CardFooter>
          <div className="flex gap-2">
            <Button disabled={!answer.trim()}>Submit</Button>
            <Button variant="secondary">I don&rsquo;t know yet</Button>
          </div>
        </CardFooter>
      </Card>
      <IdeaNote>
        The page has only the decision and the question. The why and the model answer come back from
        POST /api/review/answer after submit, never hidden in the HTML.
      </IdeaNote>
    </Screen>
  );
}

export function ReviewStatePreview({
  state,
}: {
  state: "loading" | "grading" | "result" | "dont-know" | "caught-up" | "failed" | "no-cards";
}) {
  const score: Score = 1;
  return (
    <Screen
      path={
        state === "caught-up" || state === "loading" || state === "no-cards"
          ? "/review"
          : "/review/[cardId]"
      }
    >
      {state === "loading" && <ReviewCardLoading />}
      {state === "no-cards" && <NoReviewsEmpty />}
      {state === "caught-up" && (
        <>
          <AllCaughtUpEmpty next="tomorrow" />
          <IdeaNote>
            Daily cap of 5: once today&rsquo;s 5 are done, the rest wait. Overdue cards never pile
            up.
          </IdeaNote>
        </>
      )}
      {state === "grading" && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Spinner />
                Scoring your answer
              </span>
            </CardTitle>
            <CardDescription>
              Checking it against what was actually decided in the session. Usually 3 to 8 seconds.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      {state === "failed" && (
        <ErrorState
          title="Your answer couldn't be scored"
          message="The grader didn't answer in time. Your answer is kept; try again in a minute."
          action={<Button>Try again</Button>}
        />
      )}
      {(state === "result" || state === "dont-know") && (
        <Card>
          <CardHeader>
            <CardTitle>{state === "result" ? "Your result" : "Here's the why"}</CardTitle>
            <CardDescription>
              {state === "result"
                ? "Partly right. It comes back tomorrow."
                : "No score, no streak lost. This card comes back tomorrow."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataList>
              {state === "result" && (
                <>
                  <DataListItem>
                    <DataListLabel>Score</DataListLabel>
                    <DataListValue>
                      <ScoreBadge score={score} />
                    </DataListValue>
                  </DataListItem>
                  <DataListItem>
                    <DataListLabel>What was missing</DataListLabel>
                    <DataListValue>
                      That one new line type shouldn&rsquo;t fail the whole session.
                    </DataListValue>
                  </DataListItem>
                </>
              )}
              <DataListItem>
                <DataListLabel>Why</DataListLabel>
                <DataListValue>{CARD.why.replace("SAMPLE: ", "")}</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Evidence</DataListLabel>
                <DataListValue>&ldquo;{CARD.evidence[0].quote}&rdquo;</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Next review</DataListLabel>
                <DataListValue>Tomorrow</DataListValue>
              </DataListItem>
            </DataList>
          </CardContent>
          <CardFooter>
            <Button>Next card</Button>
          </CardFooter>
        </Card>
      )}
    </Screen>
  );
}
