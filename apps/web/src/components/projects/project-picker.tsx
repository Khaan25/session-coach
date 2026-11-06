"use client";
import { useRouter } from "next/navigation";
import { useId, useOptimistic, useTransition } from "react";
import { FolderSimpleIcon } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { projectHref, projectLabel, type ProjectScope } from "@/lib/projects/scope";

export type ProjectChoice = { scope: ProjectScope; repo: string | null };
export function ProjectPicker({
  scope,
  projects,
  path,
}: {
  scope: ProjectScope;
  projects: ProjectChoice[];
  path: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useOptimistic(scope);
  const descriptionId = useId();
  const options = [
    { value: "all", label: "All projects" },
    ...projects.map((item) => ({ value: item.scope, label: projectLabel(item.scope) })),
  ];
  if (!options.some((item) => item.value === scope))
    options.push({ value: scope, label: projectLabel(scope) });
  return (
    <div className="project-toolbar" data-pending={pending || undefined}>
      <div className="project-picker-label">
        <span>Project</span>
      </div>
      <Select
        readOnly={pending}
        items={options}
        value={selection}
        onValueChange={(value) => {
          if (value && value !== scope && !pending)
            startTransition(() => {
              setSelection(value as ProjectScope);
              router.push(projectHref(path, value as ProjectScope), { scroll: false });
            });
        }}
      >
        <SelectTrigger
          aria-label="Project"
          aria-describedby={descriptionId}
          aria-busy={pending}
          size="lg"
          variant="project"
        >
          <FolderSimpleIcon aria-hidden />
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start" sideOffset={8}>
          {options.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="project-scope-note" id={descriptionId}>
        Reviews, sessions and progress follow this selection.
      </span>
      <output className="project-switch-status" aria-live="polite" aria-atomic="true">
        {pending ? `Opening ${projectLabel(selection)}…` : `Showing ${projectLabel(scope)}.`}
      </output>
    </div>
  );
}
