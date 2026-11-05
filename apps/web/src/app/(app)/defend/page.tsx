import { ShieldCheckIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { DefendFlow } from "@/components/defend/defend-flow";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { defendableCount } from "@/lib/defend/queries";

export const metadata: Metadata = { title: "Defend it" };

/**
 * /defend: explain one decision you got right against the clock, with one AI follow-up. One narrow column and nothing
 * else, so the task is the only thing on screen; each step brings its own heading.
 */
export default function DefendPage() {
  return (
    <Container>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <MeasuredSuspense label="Loading Defend it" skeleton={<DefendFlow defendable={9} />}>
          <Defend />
        </MeasuredSuspense>
      </div>
    </Container>
  );
}

// Reads the signed-in learner's answers, so it renders inside Suspense (cacheComponents).
async function Defend() {
  const user = await getCurrentUser();
  const defendable = user ? await defendableCount(user.id) : 0;
  if (defendable === 0)
    return (
      <>
        <h1 className="type-heading">Defend it</h1>
        <EmptyState
          icon={ShieldCheckIcon}
          sprite="plant"
          title="Nothing to defend yet"
          description="Defend it picks from decisions you've explained: a card you scored 2 on in a review. Explain one card right first, then come back."
          action={
            <Link href="/review" className={buttonVariants({ variant: "secondary" })}>
              Open the review queue
            </Link>
          }
        />
      </>
    );
  return <DefendFlow defendable={defendable} />;
}
