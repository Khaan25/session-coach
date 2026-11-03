"use client";

import { useId } from "react";

import type { QuestionLevel } from "@session-coach/shared/project";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { QUESTION_LEVEL_OPTIONS } from "@/lib/projects/level";

/**
 * Simple, hard or complex, with an example question for the chosen level under it.
 *
 * @param label - The field's visible label, such as the repo name.
 */
export function LevelPicker({
  label,
  value,
  onValueChange,
  disabled,
}: {
  label: React.ReactNode;
  value: QuestionLevel;
  onValueChange: (value: QuestionLevel) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const example = QUESTION_LEVEL_OPTIONS.find((option) => option.value === value)?.example;
  return (
    <Field>
      <FieldLabel id={`${id}-label`}>{label}</FieldLabel>
      <SegmentedControl
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-example`}
        value={value}
        onValueChange={(next) => onValueChange(next as QuestionLevel)}
        disabled={disabled}
      >
        {QUESTION_LEVEL_OPTIONS.map((option) => (
          <SegmentedControlItem key={option.value} value={option.value}>
            {option.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <FieldDescription id={`${id}-example`}>For example: {example}</FieldDescription>
    </Field>
  );
}
