"use client";

import { useOptimistic, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
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
            <p className="ms-7 mb-2 type-body-sm whitespace-pre-wrap text-text-2">{task.details}</p>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="flex min-h-(--control) min-w-0 flex-1 items-center ps-8">{label}</div>
      )}
    </li>
  );
}
