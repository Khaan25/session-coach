import type { Metadata } from "next";
import Link from "next/link";

import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { NoSessionsEmpty } from "@/components/app/empty-state";
import { NextCard, TodayMessage, TodayView } from "@/components/dashboard/today-view";
import { SetupGuide } from "@/components/onboarding/setup-guide";
import { ProjectSetup } from "@/components/projects/project-setup";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { Ownership } from "@/lib/progress/ownership";
import { getOwnership } from "@/lib/progress/queries";
import { emptyQueue, reviewQueue } from "@/lib/review/queries";
import { dueInWords } from "@/lib/review/schedule";
import { DAILY_CAP } from "@/lib/review/today";
import { recentSessions } from "@/lib/sessions/queries";
import { getSettingsProfile } from "@/lib/settings/profile";
import { greeting } from "@/lib/ui/greeting";

import { TodayColumn, TodaySampleView } from "./dashboard-sample-view";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <TodayColumn>
      <MeasuredSuspense label="Loading today" skeleton={<TodaySampleView />}>
        <Today />
      </MeasuredSuspense>
    </TodayColumn>
  );
}

async function Today() {
  const user = await getCurrentUser();
  if (!user) return <NoSessionsEmpty />;
  const { now, hasSession, queue, ownership, profile } = await load(user.id);
  const hello = greeting(profile?.display_name, profile?.timezone ?? "UTC", now);
  const habit = habitLine(ownership);

  if (!hasSession)
    return (
      <TodayView
        greeting={hello}
        lede="A few minutes of setup, then your agent's decisions turn into cards."
        habit={null}
        hero={
          <TodayMessage
            sprite="letter"
            title="Send your first session"
            description="Log in with the CLI, then send the session you just finished. It shows up here within a minute."
            action={
              <>
                <SetupGuide autoOpen />
                <Link href="/setup" className={buttonVariants({ variant: "secondary" })}>
                  Open setup
                </Link>
              </>
            }
          />
        }
      />
    );

  const next = queue[0];
  if (next)
    return (
      <TodayView
        greeting={hello}
        lede="Explain it from memory first. The why comes after."
        before={<ProjectSetup />}
        habit={habit}
        hero={<NextCard card={next} left={queue.length} />}
      />
    );

  const empty = await emptyQueue(user.id, now).catch((error: unknown) => {
    console.error("[dashboard] emptyQueue", error);
    return null;
  });
  if (empty && !empty.hasCards)
    return (
      <TodayView
        greeting={hello}
        lede="Your first cards are being written."
        before={<ProjectSetup />}
        habit={null}
        hero={
          <TodayMessage
            sprite="pencil"
            title="Your cards are on the way"
            description={`Each session is read for the decisions your agent made. They land here, at most ${DAILY_CAP} a day.`}
          />
        }
      />
    );

  // Defend it picks from cards explained at least once, the same rule as POST /api/defend/start.
  const canDefend = (ownership?.overall.explained ?? 0) > 0;
  return (
    <TodayView
      greeting={hello}
      lede="A few minutes a day is what makes it stick."
      before={<ProjectSetup />}
      habit={habit}
      hero={
        <TodayMessage
          sprite="tea"
          title="You're done for today"
          description={
            empty?.doneToday
              ? `You did ${DAILY_CAP} cards today. The rest come back tomorrow.`
              : empty?.nextDue
                ? `Your next card comes back ${dueInWords(empty.nextDue, empty.today)}.`
                : "Nothing is due. New sessions bring new cards."
          }
          action={
            canDefend && (
              <Link href="/defend" className={buttonVariants({ variant: "secondary" })}>
                Defend a decision
              </Link>
            )
          }
        />
      }
    />
  );
}

/** The one habit line: what the learner already owns and has explained. Null when there is nothing to count. */
function habitLine(ownership: Ownership | null) {
  if (!ownership || ownership.overall.total === 0) return null;
  const { explained, owned, total } = ownership.overall;
  return `You own ${owned} of ${total} ${total === 1 ? "decision" : "decisions"} · ${explained} explained`;
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then the queries. */
async function load(userId: string) {
  const now = new Date();
  const [sessions, queue, ownership, profile] = await Promise.all([
    recentSessions(userId, 1),
    reviewQueue(userId, now),
    // The habit line only: a failed read leaves it out. /progress shows the error.
    getOwnership().catch((error: unknown) => {
      console.error("[dashboard] getOwnership", error);
      return null;
    }),
    // The greeting only (memoized; the layout already read it): a failure greets without a name.
    getSettingsProfile().catch((error: unknown) => {
      console.error("[dashboard] getSettingsProfile", error);
      return null;
    }),
  ]);
  return { now, hasSession: sessions.length > 0, queue, ownership, profile };
}
