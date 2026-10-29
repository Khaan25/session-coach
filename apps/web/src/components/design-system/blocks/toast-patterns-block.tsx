"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Toaster, createToastManager, toast } from "@/components/ui/toast";

import { cards, session } from "../sample";

// Real toasts, not fakes: stacking, dedup and a rejecting promise are what break. Needs the page's <Toaster>.

const settleIn = (ms: number, shouldReject = false) =>
  new Promise<{ cards: number }>((resolve, reject) => {
    setTimeout(
      () =>
        shouldReject
          ? reject(new Error("The transcript could not be read"))
          : resolve({ cards: cards.length }),
      ms,
    );
  });

/* Undo: the action is the point, so the toast waits longer than the default. */
function UndoExample() {
  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={() => {
        // `add` returns the id before the action can fire, so the handler can close the toast it undoes.
        const id = toast.add({
          title: "Card skipped",
          description: cards[0].decision,
          timeout: 8000,
          actionProps: {
            children: "Undo",
            onClick: () => {
              toast.close(id);
              toast.add({
                type: "success",
                title: "Card restored",
                description: cards[0].decision,
              });
            },
          },
        });
      }}
    >
      Undo action
    </Button>
  );
}

/* Promise: one toast owns all three states, so success replaces loading instead of stacking under it. */
function PromiseExample() {
  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        className="flex-1"
        onClick={() =>
          toast.promise(settleIn(2000), {
            loading: "Writing decision cards",
            success: (result) => ({
              type: "success",
              title: "Cards ready",
              description: `${result.cards} cards from ${session.title}.`,
            }),
            error: "Cards could not be written",
          })
        }
      >
        Promise
      </Button>
      <Button
        variant="secondary"
        className="flex-1"
        onClick={() =>
          toast
            .promise(settleIn(2000, true), {
              loading: "Writing decision cards",
              success: "Cards ready",
              error: (cause: Error) => ({
                type: "error",
                title: "Cards could not be written",
                description: `${cause.message}. TODO(zia): retry copy.`,
              }),
            })
            // `promise` rejects with the original error once the toast shows; without this it reaches the console.
            .catch(() => {})
        }
      >
        Promise that rejects
      </Button>
    </div>
  );
}

/* Dedup: the same id updates the toast in place and restarts its timer; it pulses to show it landed. */
function DeduplicatedExample() {
  const seen = useRef(0);
  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={() => {
        seen.current += 1;
        toast.add({
          id: "cards-due",
          type: "info",
          title: `${seen.current} card${seen.current === 1 ? "" : "s"} due today`,
          description: "Explain each one back.",
        });
      }}
    >
      Deduplicated, press repeatedly
    </Button>
  );
}

/* Varying height: the stack measures each toast, so a one-liner and a paragraph still align. */
function VaryingHeightExample() {
  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={() => {
        toast.add({ title: "Answer saved" });
        toast.add({ type: "success", title: "Day 3 review done", description: cards[1].decision });
        toast.add({
          type: "warning",
          title: "One card is flagged",
          description: `${cards[2].decision}. One of its quotes did not match the transcript, so check it against the session before you explain it back.`,
        });
      }}
    >
      Varying height, three at once
    </Button>
  );
}

// Anchored toasts need their own manager, because their viewport renders positioners.
const anchoredToasts = createToastManager();
// A second corner needs its own manager too; sharing the default one would render each toast twice.
const bottomStart = createToastManager();

function AnchoredExample() {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  return (
    <Button
      ref={setAnchor}
      variant="secondary"
      className="w-full"
      onClick={() =>
        anchoredToasts.add({
          type: "success",
          description: "Link copied",
          timeout: 1500,
          positionerProps: { anchor, side: "top", sideOffset: 8 },
        })
      }
    >
      Anchored to this button
    </Button>
  );
}

function BottomStartExample() {
  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={() =>
        bottomStart.add({
          type: "error",
          title: "Review missed",
          description: "TODO(zia): what happens when a day 7 review is missed.",
        })
      }
    >
      Custom position, bottom start
    </Button>
  );
}

function ToastPatternsBlock() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Toasts</CardTitle>
        <CardDescription>Stack, swipe and pulse. Click to fire.</CardDescription>
      </CardHeader>
      <CardContent>
        <UndoExample />
        <PromiseExample />
        <DeduplicatedExample />
        <VaryingHeightExample />
        <Separator />
        <Toaster anchored toastManager={anchoredToasts}>
          <AnchoredExample />
        </Toaster>
        <Toaster toastManager={bottomStart} viewportClassName="sm:inset-s-4 sm:inset-e-auto">
          <BottomStartExample />
        </Toaster>
      </CardContent>
    </Card>
  );
}

export { ToastPatternsBlock };
