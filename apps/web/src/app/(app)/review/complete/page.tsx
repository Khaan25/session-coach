import { EngineeringGuide } from "@/components/art/engineering-illustrations";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/app/container";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { reviewQueue, emptyQueue } from "@/lib/review/queries";
import { parseProjectScope, projectLabel, projectHref } from "@/lib/projects/scope";
import { dueInWords } from "@/lib/review/schedule";
export const metadata: Metadata = { title: "Review complete" };
export default function Complete({ searchParams }: PageProps<"/review/complete">) {
  return (
    <Container>
      <Suspense fallback={<p>Checking your next review…</p>}>
        <Receipt searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
async function Receipt({ searchParams }: Pick<PageProps<"/review/complete">, "searchParams">) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) return null;
  const scope = parseProjectScope(params.project);
  const now = readClock();
  const [global, local, empty] = await Promise.all([
    reviewQueue(user.id, now),
    reviewQueue(user.id, now, scope),
    emptyQueue(user.id, now, scope),
  ]);
  const next = local[0] ?? global[0];
  return (
    <section className="learning-end">
      <EngineeringGuide
        pose={next ? "reflect" : empty.hasCards ? "complete" : "connect"}
        size="scene"
      />

      <h1>
        {local.length
          ? "A little more to review."
          : scope !== "all" && global.length
            ? projectLabel(scope) + " is up to date."
            : empty.hasCards
              ? "Done for today."
              : "Your next decision starts with your work."}
      </h1>
      <p>
        {next
          ? `${next === local[0] ? local.length : global.length} ${next === local[0] ? "decisions remain here" : "decisions remain in your other projects"}.`
          : empty.doneToday
            ? "You can review again tomorrow."
            : empty.nextDue
              ? "Your next review is " + dueInWords(empty.nextDue, empty.today) + "."
              : "New work will bring new decisions."}
      </p>
      <Link
        href={next ? projectHref("/review/" + next.id, local.length ? scope : "all") : "/dashboard"}
        className={buttonVariants()}
      >
        {next ? "Continue review →" : "Back to Today"}
      </Link>
    </section>
  );
}

function readClock() {
  return new Date();
}
