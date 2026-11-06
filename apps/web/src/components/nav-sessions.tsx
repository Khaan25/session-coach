"use client";

import { ProjectLink } from "@/components/projects/project-link";
import { parseProjectScope, type ProjectScope } from "@/lib/projects/scope";
import { useSearchParams, usePathname } from "next/navigation";
import { CaretRightIcon, FolderSimpleIcon } from "@phosphor-icons/react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { sessionName } from "@/lib/sessions/name";
import type { SessionListItem } from "@/lib/sessions/rows";
import { isEmptyReady, sessionLabel } from "@/lib/sessions/status-label";
import { useLiveSessions } from "@/lib/sessions/use-live-sessions";
import { NavigationFeedback } from "@/components/app/navigation-feedback";
import { useSidebar } from "@/components/ui/sidebar";

// What the badge says about the session's cards, one shape per meaning so it reads in grayscale too.

/**
 * The sidebar's latest sessions, live. Each row: the title, then the repository (folder icon) and a badge saying
 * whether its cards are ready. Without `userId` the rows stay as rendered.
 */
export function NavSessions({
  sessions,
  userId,
  scope = "all",
}: {
  sessions: SessionListItem[];
  userId?: string | null;
  scope?: ProjectScope;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { rows } = useLiveSessions(userId, sessions, { limit: 5, scope });
  if (rows.length === 0) return null;
  return (
    <Collapsible
      defaultOpen
      render={<SidebarGroup className="group-data-[collapsible=icon]:hidden" />}
    >
      <SidebarGroupLabel render={<CollapsibleTrigger />}>
        Recent sessions
        <CaretRightIcon className="ml-auto transition-transform in-data-panel-open:rotate-90 motion-reduce:transition-none" />
      </SidebarGroupLabel>
      <CollapsibleContent>
        <SidebarGroupContent>
          <SidebarMenu>
            {rows.map((session) => {
              const name = sessionName(session);
              const label = sessionLabel(session.status, session.cardCount);
              return (
                <SidebarMenuItem key={session.id}>
                  <SidebarMenuButton
                    size="lg"
                    variant="session"
                    isActive={pathname === `/s/${session.id}`}
                    render={
                      <ProjectLink href={`/s/${session.id}`} onClick={() => setOpenMobile(false)} />
                    }
                    // Native tooltip: the full title (it truncates) and what the second line means.
                    title={[name, session.repo && `Repository: ${session.repo}`, label]
                      .filter(Boolean)
                      .join("\n")}
                  >
                    <div className="sidebar-session-copy">
                      <span className="truncate">{name}</span>
                      <span className="sidebar-session-meta">
                        {session.repo && (
                          <>
                            <FolderSimpleIcon aria-hidden className="shrink-0" />
                            <span className="sr-only">Repository:</span>
                            <span className="truncate">{session.repo}</span>
                          </>
                        )}
                        <span className="sr-only">Status:</span>
                        <span
                          className="sidebar-session-status"
                          data-session-status={
                            isEmptyReady(session.status, session.cardCount)
                              ? "empty"
                              : session.status
                          }
                        >
                          {label}
                        </span>
                      </span>
                    </div>
                    <NavigationFeedback />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ScopedNavSessions(props: React.ComponentProps<typeof NavSessions>) {
  const search = useSearchParams();
  return <NavSessions {...props} scope={parseProjectScope(search.get("project"))} />;
}
