import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Code } from "@/components/ui/code-block";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Item, ItemContent, ItemDescription } from "@/components/ui/item";
import { Status } from "@/components/ui/status";
import { QuizForm } from "@/components/review/quiz-form";
import type { CardHead, CardView } from "@/lib/cards/columns";

/**
 * One decision card on /s/[id]: the decision, why, where the reason came from, the files, the evidence quotes and
 * the question, with a link into the review for this card. Takes only the learner-readable columns.
 */
export function DecisionCard({ card }: { card: CardView }) {
  const { id, decision, why, source, evidence, files, question, flagged } = card;
  return (
    // The decision over its card, as an unanswered one is laid out, so the list reads the same either way.
    <section aria-label={decision} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="type-heading-xs">{decision}</h2>
        {flagged && (
          <Badge
            status="warn"
            label={
              evidence.filter((item) => !item.verified).length === 1
                ? "One quote couldn't be verified"
                : "Some quotes couldn't be verified"
            }
          />
        )}
      </div>
      <Card>
        <CardContent>
          <DataList>
            <DataListItem>
              <DataListLabel>Why</DataListLabel>
              <DataListValue>{why}</DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Source</DataListLabel>
              <DataListValue>
                {source === "stated" ? "Stated in the session" : "Inferred: the model's guess"}
              </DataListValue>
            </DataListItem>
            <DataListItem>
              <DataListLabel>Files</DataListLabel>
              <DataListValue>
                {files.length > 0 ? (
                  <span className="flex flex-wrap gap-2">
                    {files.map((file) => (
                      <Code key={file}>{file}</Code>
                    ))}
                  </span>
                ) : null}
              </DataListValue>
            </DataListItem>
          </DataList>
        </CardContent>
        {/* Rows straight in the card under a rule, not an ItemGroup: that would draw a second frame inside this one. A
          div with role="list", because Item renders a div. */}
        {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role */}
        <div role="list" aria-label="Evidence" className="rule-top">
          {evidence.map((item) => (
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            <Item key={`${item.event_index}-${item.quote}`} role="listitem">
              <ItemContent>
                <blockquote className="type-body text-text-1">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <ItemDescription>
                  <span className="flex flex-wrap items-center gap-2">
                    <span>Event E{item.event_index}</span>
                    {item.file && (
                      <Code>
                        {item.lines ? `${item.file}:${item.lines[0]}-${item.lines[1]}` : item.file}
                      </Code>
                    )}
                  </span>
                </ItemDescription>
              </ItemContent>
              {item.verified ? (
                <Status status="ok" label="Verified" />
              ) : (
                <Status status="warn" label="Not verified" />
              )}
            </Item>
          ))}
        </div>
        <CardFooter>
          <div className="flex w-full flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 type-body">{question}</p>
            <Link
              href={`/review/${id}`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Explain it<span className="sr-only">: {decision}</span>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </section>
  );
}

/**
 * A card the learner hasn't answered yet: only the decision, the question and the answer box. The why and the
 * evidence aren't on the page at all; they come back from the grading route once the learner answers or says they
 * don't know yet (retrieval before reveal).
 */
export function LockedDecisionCard({ card }: { card: CardHead }) {
  return (
    <section aria-label={card.decision} className="flex flex-col gap-3">
      <h2 className="type-heading-xs">{card.decision}</h2>
      <QuizForm cardId={card.id} question={card.question} nextHref={null} />
    </section>
  );
}
