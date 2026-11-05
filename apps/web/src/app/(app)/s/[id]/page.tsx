import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MeasuredSuspense } from "@/components/app/measured-suspense";
import {
  SAMPLE_SESSION,
  SAMPLE_SESSION_CARDS,
  SAMPLE_SESSION_NOW,
} from "@/components/sessions/session-sample";
import { SessionView } from "@/components/sessions/session-view";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSessionWithCards } from "@/lib/cards/queries";
import { isStuck } from "@/lib/sessions/stuck";

export const metadata: Metadata = { title: "Session" };

// cacheComponents needs at least one param to prerender the shell (the layout's breadcrumb reads the pathname). A
// learner's ids can't be known at build time, so this is a placeholder; every real id loads at request time.
export function generateStaticParams() {
  return [{ id: "00000000-0000-0000-0000-000000000000" }];
}

export default function SessionPage({ params }: PageProps<"/s/[id]">) {
  // Skullet measures the real page, drawn from a sample session, so the header and each card keep their shape when the
  // data lands. The card count isn't known until then, so the list can still grow or shrink.
  return (
    <MeasuredSuspense
      label="Loading the session"
      skeleton={
        <SessionView
          session={SAMPLE_SESSION}
          cards={SAMPLE_SESSION_CARDS}
          now={SAMPLE_SESSION_NOW}
        />
      }
    >
      <SessionDetail params={params} />
    </MeasuredSuspense>
  );
}

// Reads the signed-in learner, so it renders inside Suspense (cacheComponents). Missing, malformed or another
// learner's id: not found (the query filters on the learner's id, and RLS returns no row anyway).
async function SessionDetail({ params }: Pick<PageProps<"/s/[id]">, "params">) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) notFound();
  const { now, found } = await load(user.id, id);
  if (!found) notFound();
  return <SessionView {...found} now={now} userId={user.id} stuck={isStuck(found.session, now)} />;
}

/** Reads the clock outside render (cacheComponents and the compiler's purity rule), then the session. */
async function load(userId: string, id: string) {
  const now = new Date();
  return { now, found: await getSessionWithCards(userId, id) };
}
