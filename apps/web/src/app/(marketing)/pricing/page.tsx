import { CheckIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// No billing code here: the plan says free during the trial, one plan card. Facts only from docs/ARCHITECTURE.md
// and docs/plans/pages-and-dashboard.md.

export const metadata: Metadata = {
  title: "Pricing | Session Coach",
  description: "Session Coach is free during the trial. One plan with everything in it.",
};

const included = [
  "A Claude Code hook that sends each finished session, with secrets filtered out on your laptop first",
  "3 to 5 decision cards per session, each quote checked against the session",
  "Review on day 1, 3 and 7, with each answer scored 0, 1 or 2",
  "A progress view of the decisions you can still explain",
  "A daily email when cards are due, which you can turn off",
] as const;

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-(--container) flex-col gap-12 px-(--gutter-sm) py-16 sm:px-(--gutter) sm:py-20">
      <MarketingPageHeader title="Pricing">
        Session Coach is free during the trial.
      </MarketingPageHeader>

      <section aria-labelledby="plan-title" className="max-w-xl">
        <Card size="lg">
          <CardHeader>
            <CardTitle>
              <h2 id="plan-title" className="flex flex-wrap items-center gap-3">
                Trial
                <Badge variant="success">Free</Badge>
              </h2>
            </CardTitle>
            <CardDescription>
              Free during the 8x Playmakers trial, 28 Oct to 6 Nov 2026. No card needed, and we
              won&apos;t charge you without asking first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="sr-only">What&apos;s included</h3>
            <ul className="flex flex-col gap-3">
              {included.map((item) => (
                <li key={item} className="flex gap-3 type-body text-text-2">
                  <CheckIcon
                    weight="bold"
                    className="mt-1 size-4 shrink-0 text-text-1"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {/* Points at /how-it-works until the CLI ships; then "Set it up" → /setup. */}
            <Link href="/how-it-works" className={buttonVariants({ size: "lg" })}>
              See how it works
            </Link>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}
