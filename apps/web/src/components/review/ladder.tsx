import { ArrowRightIcon, CheckIcon } from "@phosphor-icons/react/ssr";

import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { Badge } from "@/components/ui/badge";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import { Item, ItemContent, ItemDescription, ItemMedia } from "@/components/ui/item";
import { outcomeInWords, outcomesAt, stageIndex, STAGES } from "@/lib/review/ladder";
import type { Level } from "@/lib/review/level";
import type { Step } from "@/lib/review/schedule";

/** One line per rung, for someone who has never seen the schedule. Index n is `STAGES[n]`. */
export const STAGE_HELP = [
  "New: you haven't explained it yet. It waits up to 7 days after its session, then stays only on the session's page.",
  "Day 1: the day after your first answer. The first check that it stuck overnight.",
  "Day 4: three days after day 1. Long enough to forget what you only skimmed.",
  "Day 11: a week after day 4. Explain it then and you own it.",
  "Owned: you explained it on day 11. It doesn't come back.",
] as const;

/** The card's place on its ladder: passed rungs done, the current one marked, the rest ahead. */
export function ScheduleTrack({ level, label }: { level: Level; label: string }) {
  const at = stageIndex(level);
  return (
    <ol aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {STAGES.map((stage, i) => (
        <li key={stage} className="flex items-center gap-1.5">
          {i > 0 && <ArrowRightIcon aria-hidden className="size-3 text-text-3" />}
          {i < at ? (
            <Badge variant="success">
              <CheckIcon aria-hidden />
              {stage}
            </Badge>
          ) : i === at ? (
            <Badge aria-current="step">{stage}</Badge>
          ) : (
            <Badge variant="outline">{stage}</Badge>
          )}
        </li>
      ))}
    </ol>
  );
}

/**
 * What a 2, a 1, a 0 and "I don't know yet" would each do to a card at `step`, from `nextReview`. `given` lights the
 * row for the answer just given.
 */
export function ScoreOutcomes({ step, given }: { step: Step; given?: Score | "skip" }) {
  const o = outcomesAt(step);
  const rows = [
    { key: 2, media: <ScoreBadge score={2} />, outcome: o.pass },
    { key: 1, media: <ScoreBadge score={1} />, outcome: o.miss },
    { key: 0, media: <ScoreBadge score={0} />, outcome: o.miss },
    { key: "skip", media: <Badge variant="outline">Don&rsquo;t know</Badge>, outcome: o.skip },
  ] as const;
  return (
    <div className="flex flex-col gap-1 p-2">
      {rows.map(({ key, media, outcome }) => (
        <Item key={key} size="sm" selected={given === key}>
          <ItemMedia>{media}</ItemMedia>
          <ItemContent>
            <ItemDescription>
              {outcomeInWords(step, outcome)}
              {key === "skip" && " Costs nothing."}
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </div>
  );
}

/** Explained vs owned, the two words the dashboard meter uses. */
export function ExplainedOwned() {
  return (
    <DataList>
      <DataListItem>
        <DataListLabel>Explained</DataListLabel>
        <DataListValue>You scored 2 on it at least once.</DataListValue>
      </DataListItem>
      <DataListItem>
        <DataListLabel>Owned</DataListLabel>
        <DataListValue>You scored 2 on its day 11 review, a week after day 4.</DataListValue>
      </DataListItem>
    </DataList>
  );
}
