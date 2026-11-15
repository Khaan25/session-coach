"use client";

import { useState } from "react";

import type { QuestionLevel } from "@session-coach/shared/project";

import { useAction } from "@/components/app/dry-run";
import { toast } from "@/components/ui/toast";

import { setProjectLevel } from "@/app/(app)/settings/actions";

import { LevelPicker } from "./level-picker";

/** One repo's level in /settings. Saves on change and goes back to the saved level if the save fails. */
export function ProjectLevelField({ repo, level }: { repo: string; level: QuestionLevel }) {
  const save = useAction(setProjectLevel);
  const [value, setValue] = useState(level);
  const [pending, setPending] = useState(false);
  return (
    <LevelPicker
      label={repo}
      value={value}
      disabled={pending}
      onValueChange={(next) => {
        const previous = value;
        setValue(next);
        setPending(true);
        const saving = async () => {
          const { error } = await save({ repo, question_level: next });
          if (error) {
            throw new Error(error);
          }
        };
        const run = async () => {
          try {
            await toast.promise(saving(), {
              loading: "Saving",
              success: `Questions for ${repo} set to ${next}`,
              error: (error: Error) => error.message,
            });
          } catch {
            setValue(previous);
          } finally {
            setPending(false);
          }
        };
        void run();
      }}
    />
  );
}
