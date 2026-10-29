"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput } from "@/components/ui/combobox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  ComboboxVirtualizedItem,
  ComboboxVirtualizedList,
  useComboboxVirtualizer,
} from "@/components/ui/virtualized-combobox";

import { cards } from "../sample";

type Decision = { id: string; label: string; source: string };

// Ten thousand generated rows, because the count is the point: past about a thousand, mounting every row makes
// opening the popup slow. The labels cycle through the sample cards.
const DECISIONS: Decision[] = Array.from({ length: 10000 }, (_, index) => {
  const card = cards[index % cards.length];
  return { id: String(index + 1), label: `${index + 1}. ${card.decision}`, source: card.source };
});

const toLabel = (decision: Decision | null) => decision?.label ?? "";

/*
 * Virtualized single-select. Only the list is the windowed one. `virtualized` tells Base UI the DOM no longer
 * holds every item, and `open` is controlled because the virtualizer stops measuring while the popup is closed.
 */
function DecisionSearchBlock() {
  const [open, setOpen] = useState(false);
  const { virtualizerRef, onItemHighlighted } = useComboboxVirtualizer();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision search</CardTitle>
        <CardDescription>Ten thousand cards, one mounted screenful.</CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel htmlFor="decision-search-input">Find a decision</FieldLabel>
          <Combobox
            virtualized
            items={DECISIONS}
            open={open}
            onOpenChange={setOpen}
            itemToStringLabel={toLabel}
            onItemHighlighted={onItemHighlighted}
          >
            <ComboboxInput id="decision-search-input" placeholder="Search decisions" />
            <ComboboxContent>
              <ComboboxEmpty>No decisions match.</ComboboxEmpty>
              <ComboboxVirtualizedList<Decision> open={open} virtualizerRef={virtualizerRef}>
                {(decision, virtualItem) => (
                  <ComboboxVirtualizedItem
                    key={virtualItem.key}
                    virtualItem={virtualItem}
                    value={decision}
                  >
                    <span className="truncate">{decision.label}</span>
                    <span className="ms-auto pe-5 text-text-3">{decision.source}</span>
                  </ComboboxVirtualizedItem>
                )}
              </ComboboxVirtualizedList>
            </ComboboxContent>
          </Combobox>
          <FieldDescription>
            Type to filter; arrow keys wrap from the last row to the first.
          </FieldDescription>
        </Field>
      </CardContent>
    </Card>
  );
}

export { DecisionSearchBlock };
