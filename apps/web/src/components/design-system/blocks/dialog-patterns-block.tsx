"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import { cards, REVIEW_DAYS, session } from "../sample";

/*
 * Close confirmation. Every way out (Escape, the backdrop, the close button) lands in onOpenChange, so holding
 * the close there keeps the dialog open while the AlertDialog asks. An untouched draft closes at once: asking
 * someone who typed nothing teaches them to dismiss the question unread.
 */
function CloseConfirmationDialog() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const discard = () => {
    setDraft("");
    setConfirmOpen(false);
    setDialogOpen(false);
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open && draft.trim()) {
          setConfirmOpen(true);
          return;
        }
        setDraft("");
        setDialogOpen(open);
      }}
    >
      <DialogTrigger render={<Button variant="secondary" className="w-full" />}>
        Close confirmation
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cards[0].question}</DialogTitle>
          <DialogDescription>
            Type an answer, then press Escape to see the confirmation.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="draft-answer">Your explanation</FieldLabel>
              <Textarea
                id="draft-answer"
                rows={3}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </Field>
          </FieldGroup>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
          <Button onClick={discard}>Submit answer</Button>
        </DialogFooter>
      </DialogContent>
      {/* Inside the Dialog root, so Base UI counts it as nested and the answer dialog recedes behind it. */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this answer?</AlertDialogTitle>
            <AlertDialogDescription>Closing now loses what you wrote.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep writing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discard}>
              Discard answer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

/* Nested dialog: a whole Dialog inside the parent's content. The parent shrinks and dims behind it. */
function NestedDialogExample() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="secondary" className="w-full" />}>
        Nested dialog
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pick a review day</DialogTitle>
          <DialogDescription>{cards[1].decision}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ItemGroup>
            {REVIEW_DAYS.map((day) => (
              <Item key={day} size="sm" render={<button type="button" />}>
                <ItemContent>
                  <ItemTitle>Day {day}</ItemTitle>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
          <Dialog>
            <DialogTrigger render={<Button variant="ghost" className="w-full" />}>
              Why these days?
            </DialogTrigger>
            <DialogContent size="sm">
              <DialogHeader>
                <DialogTitle>Why day 1, 3 and 7</DialogTitle>
                <DialogDescription>TODO(zia): the reason for this spacing.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="secondary" />}>Back</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
          <Button>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Long enough to scroll: the sample cards repeated.
const LONG_LIST = Array.from({ length: 24 }, (_, index) => ({
  key: index,
  card: cards[index % cards.length],
}));

/* Inside scroll: the list scrolls while the title and footer stay put; one scrollbar, not two. */
function InsideScrollDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="secondary" className="w-full" />}>
        Inside scroll
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cards from {session.title}</DialogTitle>
          <DialogDescription>{LONG_LIST.length} cards to explain back.</DialogDescription>
        </DialogHeader>
        <ScrollArea
          className="flex min-h-0 flex-auto overflow-hidden"
          viewportClassName="h-auto min-h-0 flex-auto overflow-y-auto overscroll-contain"
        >
          <ItemGroup>
            {LONG_LIST.map(({ key, card }) => (
              <Item key={key}>
                <ItemContent>
                  <ItemTitle>{card.decision}</ItemTitle>
                  <ItemDescription>{card.question}</ItemDescription>
                </ItemContent>
                <Badge variant={card.flagged ? "warn" : "default"}>
                  {card.flagged ? "Flagged" : card.source}
                </Badge>
              </Item>
            ))}
          </ItemGroup>
        </ScrollArea>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
          <Button>Start review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogPatternsBlock() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dialog patterns</CardTitle>
        <CardDescription>Interception, nesting and interior scroll. Click to open.</CardDescription>
      </CardHeader>
      <CardContent>
        <CloseConfirmationDialog />
        <NestedDialogExample />
        <InsideScrollDialog />
      </CardContent>
    </Card>
  );
}

export { DialogPatternsBlock };
