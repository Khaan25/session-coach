import { CaretRightIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";

/** The reviews a card climbs after its first answer: days 1, 4 and 11, then owned. */
const LADDER = ["Day 1", "Day 4", "Day 11", "Owned"] as const;

/** The reviews a card climbs, as a row of outlined steps: what the due block shows before any card exists. */
export function ReviewLadder() {
  return (
    <ol aria-label="Review schedule" className="flex flex-wrap items-center gap-2">
      {LADDER.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <Badge variant="outline">{label}</Badge>
          {i < LADDER.length - 1 && <CaretRightIcon aria-hidden="true" className="text-text-3" />}
        </li>
      ))}
    </ol>
  );
}
