"use client";

import { useState } from "react";

import type { QuestionLevel } from "@session-coach/shared/project";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

import { setProjectLevel } from "@/app/(app)/settings/actions";

import { LevelPicker } from "./level-picker";

/**
 * The first-time question for a repo: how hard should its questions be. Save keeps the choice; "Not now" keeps simple.
 * Both mark the project onboarded, so the card goes away; the level can still change in /settings.
 */
export function ProjectSetupCard({
  repo,
  save: saveLevel = setProjectLevel,
}: {
  repo: string;
  /** The Server Action by default; /canvas passes one that saves nothing. */
  save?: typeof setProjectLevel;
}) {
  const [level, setLevel] = useState<QuestionLevel>("simple");
  const [pending, setPending] = useState(false);

  const save = (question_level: QuestionLevel) => {
    setPending(true);
    toast
      .promise(
        saveLevel({ repo, question_level }).then(({ error }) => {
          if (error) throw new Error(error);
        }),
        {
          loading: "Saving",
          success: `Questions for ${repo} set to ${question_level}`,
          error: (error: Error) => error.message,
        },
      )
      .catch(() => {})
      .finally(() => setPending(false));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Set up {repo}: how hard should questions be?</h2>
        </CardTitle>
        <CardDescription>
          Applies to new sessions from this repo. You can change it in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LevelPicker
          label="Question level"
          value={level}
          onValueChange={setLevel}
          disabled={pending}
        />
      </CardContent>
      <CardFooter>
        <Button onClick={() => save(level)} disabled={pending}>
          Save
        </Button>
        <Button variant="ghost" onClick={() => save("simple")} disabled={pending}>
          Not now
        </Button>
      </CardFooter>
    </Card>
  );
}
