"use client";

import { useState } from "react";
import Link from "next/link";
import { LockSimpleIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import {
  ExplainedOwned,
  ScheduleTrack,
  ScoreOutcomes,
  STAGE_HELP,
} from "@/components/review/ladder";
import { STAGES } from "@/lib/review/ladder";
import type { QueueCard } from "@/lib/review/queries";

/**
 * Today's queue on the left; on the right, the picked card's place on the ladder and what each answer would do to
 * it, so the schedule is taught on the card it applies to. `queue` is never empty.
 */
export function ReviewQueue({ queue, cap }: { queue: QueueCard[]; cap: number }) {
  const [picked, setPicked] = useState(queue[0]?.id);
  const card = queue.find(({ id }) => id === picked) ?? queue[0];
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="flex flex-col gap-6 lg:col-span-3">
        <Card>
          <CardHeader>
            {/* skullet-own: static text stays real in the skeleton; only the queue is drawn as bars. */}
            <CardTitle skullet-own="">
              <h2>Due today</h2>
            </CardTitle>
            <CardDescription skullet-own="">
              Up to {cap} a day: cards due again, and new cards from the last 7 days.
            </CardDescription>
            {card && (
              <CardAction>
                <Link href={`/review/${queue[0]?.id}`} className={buttonVariants()}>
                  Start review
                </Link>
              </CardAction>
            )}
          </CardHeader>
          <div className="flex flex-col gap-1 p-2">
            {queue.map((row) => (
              <Item
                key={row.id}
                selected={row.id === card?.id}
                render={
                  <button type="button" aria-label={`${row.decision}, ${STAGES[row.step]}`} />
                }
                onClick={() => setPicked(row.id)}
              >
                <ItemContent>
                  <ItemTitle>{row.decision}</ItemTitle>
                  <ItemDescription>{row.sessionName}</ItemDescription>
                </ItemContent>
                <Badge variant={row.step === 0 ? "outline" : "default"}>{STAGES[row.step]}</Badge>
              </Item>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>What a decision card is</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataList>
              <DataListItem>
                <DataListLabel>Decision</DataListLabel>
                <DataListValue>One choice your agent made in a session.</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Question</DataListLabel>
                <DataListValue>What you explain back, in your own words.</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Why</DataListLabel>
                <DataListValue>
                  <span className="flex items-center gap-2">
                    <LockSimpleIcon aria-hidden />
                    Locked until you answer, then shown with the quote it came from.
                  </span>
                </DataListValue>
              </DataListItem>
            </DataList>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col gap-6 lg:col-span-2">
        {card && (
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>This card</h2>
              </CardTitle>
              {/* Follows the picked row, so a screen reader hears which rung the new pick is on. */}
              <CardDescription aria-live="polite">
                {card.step === 0
                  ? "New: you haven't explained it yet."
                  : `Due for its ${STAGES[card.step].toLowerCase()} review.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <ScheduleTrack level={card.step} label={`Where "${card.decision}" is`} />
                <p className="type-body-sm text-text-2">{STAGE_HELP[card.step]}</p>
              </div>
            </CardContent>
            <ScoreOutcomes step={card.step} />
            <CardFooter>
              <Link
                href={`/review/${card.id}`}
                className={buttonVariants({ variant: "secondary" })}
              >
                Answer this card
              </Link>
            </CardFooter>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Explained vs owned</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExplainedOwned />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
