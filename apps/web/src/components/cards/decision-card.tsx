import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Code } from "@/components/ui/code-block";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Item, ItemContent, ItemDescription, ItemGroup } from "@/components/ui/item";
import { Status } from "@/components/ui/status";
import type { CardView } from "@/lib/sample/cards";

/**
 * One decision card on /s/[id]: the decision, why, where the reason came from, the files, the evidence quotes and
 * the question, with a link into the review for this card. Takes only the learner-readable columns.
 */
export function DecisionCard({ card }: { card: CardView }) {
  const { id, decision, why, source, evidence, files, question, flagged } = card;
  return (
    <Card size="lg">
      <CardHeader>
        <CardTitle>
          <h2>{decision}</h2>
        </CardTitle>
        {flagged && (
          <CardAction>
            <Badge status="warn" label="One quote couldn't be verified" />
          </CardAction>
        )}
      </CardHeader>
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
      <ItemGroup aria-label="Evidence">
        {evidence.map((item) => (
          // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role.
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
          <Item key={`${item.event_index}-${item.quote}`} role="listitem">
            <ItemContent>
              <blockquote className="type-body text-text-1">&ldquo;{item.quote}&rdquo;</blockquote>
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
      </ItemGroup>
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
  );
}
