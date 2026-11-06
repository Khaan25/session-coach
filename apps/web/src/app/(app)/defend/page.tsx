import type { Metadata } from "next";

import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { DefendColumn, DefendFlow, NothingToDefend } from "@/components/defend/defend-flow";
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
      <DefendColumn>
        <MeasuredSuspense label="Loading Defend it" skeleton={<DefendFlow defendable={9} />}>
          <Defend />
        </MeasuredSuspense>
      </DefendColumn>
    </Container>
  );
}

// Reads the signed-in learner's answers, so it renders inside Suspense (cacheComponents).
async function Defend() {
  const user = await getCurrentUser();
  const defendable = user ? await defendableCount(user.id) : 0;
  if (defendable === 0) return <NothingToDefend />;
  return <DefendFlow defendable={defendable} />;
}
