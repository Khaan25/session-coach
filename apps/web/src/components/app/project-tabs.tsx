"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { useOptimisticNavigation } from "@/hooks/use-optimistic-navigation";

/** One project tab: a repo (null for every project) and the page's URL filtered to it. */
export type ProjectTab = { repo: string | null; href: string };

/**
 * The project filter above a page's blocks, and the blocks under it. A tab is a link to `?repo=`, whose page reads the
 * learner's rows, so the server render takes as long as those reads. The clicked tab turns current at once and the
 * blocks dim (`--stale-opacity`) until the new ones land, instead of nothing changing until then.
 */
export function ProjectTabs({
  tabs,
  repo,
  children,
}: {
  tabs: ProjectTab[];
  /** The repo the page was rendered for. */
  repo: string | null;
  children: React.ReactNode;
}) {
  const { current, pending, navigate } = useOptimisticNavigation(repo);
  return (
    <>
      <nav aria-label="Projects" className="flex flex-wrap gap-2">
        {tabs.map(({ repo: name, href }) => (
          <Link
            key={name ?? ""}
            href={href}
            aria-current={name === current ? "page" : undefined}
            className={buttonVariants({
              variant: name === current ? "secondary" : "ghost",
              size: "sm",
            })}
            onNavigate={navigate(name, href)}
          >
            {name ?? "All projects"}
          </Link>
        ))}
      </nav>
      <div
        aria-busy={pending || undefined}
        data-pending={pending || undefined}
        className="flex flex-col gap-6 transition-opacity duration-(--dur-base) data-pending:opacity-(--stale-opacity)"
      >
        {children}
      </div>
    </>
  );
}
