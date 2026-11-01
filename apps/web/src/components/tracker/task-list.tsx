"use client";

import { useOptimistic, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Markdown } from "@/components/tracker/markdown";
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import { CopyButton } from "@/components/ui/copy-button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { PROJECT_CONTEXT } from "@/lib/tracker/context";
import type { TrackerTask } from "@/lib/tracker/queries";

import { setTaskDone } from "@/app/(app)/tracker/actions";

// One hue per person (Zia blue, Kasam green), so whose task it is reads at a glance; "both" stays neutral.
const owners = {
  zia: { label: "Zia", kind: "run" },
  kasam: { label: "Kasam", kind: "model" },
  both: { label: "Both", kind: undefined },
} as const;

/** The build tracker: tasks grouped under their section, a tick to mark done, and details behind a caret. */
export function TaskList({ tasks }: { tasks: TrackerTask[] }) {
  const [optimistic, setOptimistic] = useOptimistic(
    tasks,
    (current, { id, done }: { id: string; done: boolean }) =>
      current.map((t) =>
        t.id === id ? { ...t, done_at: done ? new Date().toISOString() : null } : t,
      ),
  );
  const [, startTransition] = useTransition();

  function toggle(id: string, done: boolean) {
    startTransition(async () => {
      setOptimistic({ id, done });
      const { error } = await setTaskDone({ id, done });
      if (error) toast.add({ title: error, type: "error" });
    });
  }

  const sections = Map.groupBy(optimistic, (t) => t.section);
  const doneCount = optimistic.filter((t) => t.done_at).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-soft bg-well p-2">
        <Collapsible className="flex flex-col">
          <CollapsibleRow className="w-full">
            <span className="type-body text-text-1">Project context</span>
          </CollapsibleRow>
          <CollapsibleContent>
            <Details
              markdown={PROJECT_CONTEXT}
              copyLabel="project context"
              copyValue={PROJECT_CONTEXT}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
      <Progress value={optimistic.length ? (doneCount / optimistic.length) * 100 : 0}>
        <span className="type-label text-text-2">
          {doneCount} of {optimistic.length} done
        </span>
      </Progress>
      {[...sections].map(([section, items]) => (
        <section key={section} className="flex flex-col gap-2">
          <h2 className="flex items-baseline gap-2 type-heading-sm text-text-1">
            {section}
            <span className="type-label-sm data text-text-3">
              {items.filter((t) => t.done_at).length}/{items.length}
            </span>
          </h2>
          <ul className="flex flex-col">
            {items.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={toggle} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
}: {
  task: TrackerTask;
  onToggle: (id: string, done: boolean) => void;
}) {
  const done = Boolean(task.done_at);
  const owner = task.owner ? owners[task.owner] : null;
  const label = (
    <span className="flex min-w-0 items-center gap-2">
      {owner && <Badge kind={owner.kind} label={owner.label} size="pill" />}
      <span className={done ? "type-body text-text-3 line-through" : "type-body text-text-1"}>
        {task.title}
      </span>
    </span>
  );

  return (
    <li className="flex items-start gap-3 py-1">
      <Checkbox
        checked={done}
        onCheckedChange={(checked) => onToggle(task.id, checked)}
        aria-label={`${task.title}: done`}
        className="mt-2.5"
      />
      {task.details ? (
        <Collapsible className="min-w-0 flex-1">
          <CollapsibleRow className="w-full">{label}</CollapsibleRow>
          <CollapsibleContent>
            <Details
              markdown={task.details}
              copyLabel={`details of ${task.title}`}
              copyValue={asMarkdown(task)}
            />
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="flex min-h-(--control) min-w-0 flex-1 items-center ps-8">{label}</div>
      )}
    </li>
  );
}

/** A task as one Markdown block, for pasting into a PR, a chat or an agent prompt. */
function asMarkdown(task: TrackerTask) {
  const owner = task.owner ? `Owner: ${owners[task.owner].label}\n\n` : "";
  return `## ${task.title}\n\n${owner}${task.details?.trim() ?? ""}\n`;
}

/** Expanded notes: rendered Markdown with a copy button that copies the source. */
function Details({
  markdown,
  copyLabel,
  copyValue,
}: {
  markdown: string;
  copyLabel: string;
  copyValue: string;
}) {
  return (
    <div className="relative ms-7 mb-3 pe-10">
      <CopyButton
        value={copyValue}
        label={copyLabel}
        size="icon-sm"
        variant="ghost"
        className="absolute end-0 top-2"
      />
      <Markdown>{markdown.trim()}</Markdown>
    </div>
  );
}
