"use client";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { FolderSimpleIcon } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export type ProjectTab = { repo: string | null; href: string };
const projectValue = (repo: string | null) => (repo === null ? "all" : `repo:${repo}`);
/** Existing project URL filtering, presented as a compact, keyboard-accessible switcher. */
export function ProjectTabs({
  tabs,
  repo,
  children,
}: {
  tabs: ProjectTab[];
  repo: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(repo);
  const options = tabs.map((item) => ({
    value: projectValue(item.repo),
    label: item.repo ?? "All projects",
  }));
  return (
    <>
      <nav aria-label="Projects" className="workspace-project-switch">
        <span>Project</span>
        <Select
          items={options}
          value={projectValue(current)}
          readOnly={pending}
          onValueChange={(value) => {
            const choice = tabs.find((item) => projectValue(item.repo) === value);
            if (choice)
              startTransition(() => {
                setCurrent(choice.repo);
                router.push(choice.href, { scroll: false });
              });
          }}
        >
          <SelectTrigger variant="scope" aria-label="Project" aria-busy={pending}>
            <FolderSimpleIcon aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start">
            {options.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </nav>
      <div
        aria-busy={pending || undefined}
        data-pending={pending || undefined}
        className="workspace-project-content"
      >
        {children}
      </div>
    </>
  );
}
