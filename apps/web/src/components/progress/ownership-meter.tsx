"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import type { Ownership, OwnershipCount } from "@/lib/progress/ownership";

// A client component only because ProgressValue takes a render function, which can't cross from the server.

/** "Explained 9 · owned 2 of 30". */
const line = ({ explained, owned, total }: OwnershipCount) =>
  `Explained ${explained} · owned ${owned} of ${total}`;

/**
 * The dashboard's ownership meter: the overall line, then one bar per repo linking to the sessions filtered to it.
 * The bar fills with explained cards, not owned ones: no card is owned before about 14 Nov (DECISIONS, 2026-11-04
 * review ladder), so an owned bar would sit empty. Sessions sent without a repo are one unlinked "No project" row.
 */
export function OwnershipMeter({ ownership }: { ownership: Ownership }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{line(ownership.overall)} decisions</h2>
        </CardTitle>
        <CardDescription>
          Explained means you answered it right once. Owned means you still could on day 11.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ownership.repos.map((row) => (
          <Progress key={row.repo ?? ""} value={Math.round((row.explained / row.total) * 100)}>
            <ProgressLabel>
              {row.repo === null ? (
                "No project"
              ) : (
                <Link
                  href={`/dashboard?repo=${encodeURIComponent(row.repo)}`}
                  className={buttonVariants({ variant: "link" })}
                >
                  {row.repo}
                </Link>
              )}
            </ProgressLabel>
            <ProgressValue>{() => line(row)}</ProgressValue>
          </Progress>
        ))}
      </CardContent>
    </Card>
  );
}
