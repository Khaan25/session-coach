"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Markdown } from "@/features/tracker/markdown";
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { TrackerTask } from "@/features/tracker/queries";

import { editTask, setTaskDone } from "@/features/tracker/actions";

// One hue per person (Zia blue, Kasam green), so whose task it is reads at a glance; "both" stays neutral. The hue
// comes from the design system's kind slots: data-kind sets --accent-tint and --accent-label (tokens.css).
const owners = {
  zia: { label: "Zia", kind: "run" },
  kasam: { label: "Kasam", kind: "model" },
  both: { label: "Both", kind: undefined },
} as const;

type Patch = Partial<Pick<TrackerTask, "done_at" | "title" | "details">>;
type EditField = "title" | "details";

/**
 * The build tracker: tasks grouped under their section, a tick to mark done, and details behind a caret. A title or
 * its details can be edited in place: double-click, then click outside to save or press Esc to cancel.
 *
 * @param tasks - In list order, from `getTrackerTasks()`.
 * @param context - The Project context Markdown. Passed in from the server page so the team-only text never ships in
 *   a public JS chunk.
 */
export function TaskList({ tasks, context }: { tasks: TrackerTask[]; context: string }) {
  const [optimistic, setOptimistic] = useOptimistic(
    tasks,
    (current, { id, patch }: { id: string; patch: Patch }) =>
      current.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  );
  const [, startTransition] = useTransition();
  // Tasks with a save in flight: their box is read-only, so two quick clicks can't race and save the wrong state.
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());

  /** Shows the change at once, saves it, and puts it back (with a toast) if the save fails. */
  function save(id: string, patch: Patch, call: () => Promise<{ error: string | null }>) {
    if (saving.has(id)) return;
    setSaving((current) => new Set(current).add(id));
    startTransition(async () => {
      setOptimistic({ id, patch });
      try {
        const { error } = await call();
        if (error) toast.add({ title: error, type: "error" });
      } catch {
        toast.add({
          title: "That task couldn't be updated. Check your connection.",
          type: "error",
        });
      } finally {
        setSaving((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    });
  }

  function toggle(id: string, done: boolean) {
    save(id, { done_at: done ? new Date().toISOString() : null }, () => setTaskDone({ id, done }));
  }

  function edit(task: TrackerTask, field: EditField, value: string) {
    const next = field === "title" ? value.trim() : value.trim() || null;
    if (next === (task[field] ?? null) || (field === "title" && !next)) return;
    save(task.id, { [field]: next }, () => editTask({ id: task.id, [field]: value }));
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
            <Details markdown={context} copyLabel="project context" copyValue={context} />
          </CollapsibleContent>
        </Collapsible>
      </div>
      <div className="flex flex-col gap-2">
        <Progress value={optimistic.length ? (doneCount / optimistic.length) * 100 : 0}>
          <ProgressLabel>
            {doneCount} of {optimistic.length} done
          </ProgressLabel>
        </Progress>
        <p className="type-label-sm text-text-3">
          Double-click a title or its notes to edit. Click outside to save, Esc to cancel.
        </p>
      </div>
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
              <TaskRow
                key={task.id}
                task={task}
                saving={saving.has(task.id)}
                onToggle={toggle}
                onEdit={edit}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TaskRow({
  task,
  saving,
  onToggle,
  onEdit,
}: {
  task: TrackerTask;
  saving: boolean;
  onToggle: (id: string, done: boolean) => void;
  onEdit: (task: TrackerTask, field: EditField, value: string) => void;
}) {
  const [editing, setEditing] = useState<EditField | null>(null);
  const done = Boolean(task.done_at);
  const owner = task.owner ? owners[task.owner] : null;
  const label = (
    <span className="flex min-w-0 items-center gap-2">
      {owner && (
        <span
          data-kind={owner.kind}
          className="inline-flex min-h-(--tag) shrink-0 items-center rounded-full bg-accent-tint px-2 py-0.5 type-label-sm text-accent-label"
        >
          {owner.label}
        </span>
      )}
      <span
        title="Double-click to edit"
        onDoubleClick={(event) => {
          event.preventDefault();
          setEditing("title");
        }}
        className={done ? "type-body text-text-3 line-through" : "type-body text-text-1"}
      >
        {task.title}
      </span>
    </span>
  );

  return (
    <li className="flex items-start gap-3 py-1">
      <Checkbox
        checked={done}
        // Read-only, not disabled, while saving: the box keeps its look and keyboard focus; toggle ignores the click.
        readOnly={saving}
        onCheckedChange={(checked) => onToggle(task.id, checked)}
        aria-label={`${task.title}: done`}
        className="mt-2.5"
      />
      <Collapsible className="min-w-0 flex-1">
        {editing === "title" ? (
          <EditBox
            multiline={false}
            initial={task.title}
            label={`Title of ${task.title}`}
            onDone={(value) => {
              setEditing(null);
              if (value !== null) onEdit(task, "title", value);
            }}
          />
        ) : (
          <CollapsibleRow className="w-full">{label}</CollapsibleRow>
        )}
        <CollapsibleContent>
          {editing === "details" ? (
            <div className="ms-7 mb-3">
              <EditBox
                multiline
                initial={task.details?.trim() ?? ""}
                label={`Details of ${task.title}, in Markdown`}
                onDone={(value) => {
                  setEditing(null);
                  if (value !== null) onEdit(task, "details", value);
                }}
              />
            </div>
          ) : (
            <Details
              markdown={task.details}
              copyLabel={`details of ${task.title}`}
              copyValue={asMarkdown(task)}
              onEdit={() => setEditing("details")}
            />
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

/** A task as one Markdown block, for pasting into a PR, a chat or an agent prompt. */
function asMarkdown(task: TrackerTask) {
  const owner = task.owner ? `Owner: ${owners[task.owner].label}\n\n` : "";
  return `## ${task.title}\n\n${owner}${task.details?.trim() ?? ""}\n`;
}

/**
 * Expanded notes: rendered Markdown with a copy button that copies the source. With `onEdit`, a double-click on the
 * notes opens them for editing, and an empty task offers to add some.
 */
function Details({
  markdown,
  copyLabel,
  copyValue,
  onEdit,
}: {
  markdown: string | null;
  copyLabel: string;
  copyValue: string;
  onEdit?: () => void;
}) {
  return (
    <div className="relative ms-7 mb-3 pe-10">
      {markdown && (
        <CopyButton
          value={copyValue}
          label={copyLabel}
          size="icon-sm"
          variant="ghost"
          className="absolute end-0 top-2"
        />
      )}
      {/* Double-click is a shortcut for the mouse; it stays out of the tab order, like selecting text. */}
      <div onDoubleClick={onEdit} title={onEdit ? "Double-click to edit" : undefined}>
        {markdown ? (
          <Markdown>{markdown.trim()}</Markdown>
        ) : (
          <p className="my-3 type-body text-text-3">No notes yet. Double-click to add some.</p>
        )}
      </div>
    </div>
  );
}

/**
 * The in-place editor: focused on open, saves on blur (click outside), Enter saves a title, Cmd/Ctrl+Enter saves
 * notes, Esc cancels. `onDone` gets the text, or null when cancelled.
 */
function EditBox({
  multiline,
  initial,
  label,
  onDone,
}: {
  multiline: boolean;
  initial: string;
  label: string;
  onDone: (value: string | null) => void;
}) {
  // Esc unmounts the box; this stops the blur that may follow from saving what was just cancelled.
  const cancelled = useRef(false);
  const props = {
    autoFocus: true,
    defaultValue: initial,
    "aria-label": label,
    onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!cancelled.current) onDone(event.currentTarget.value);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === "Escape") {
        cancelled.current = true;
        onDone(null);
      } else if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        event.currentTarget.blur();
      }
    },
  };
  return multiline ? <Textarea {...props} /> : <Input {...props} />;
}
