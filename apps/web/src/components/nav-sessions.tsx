"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionStatus } from "@session-coach/shared/session";
import { CaretRightIcon, FolderSimpleIcon } from "@phosphor-icons/react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
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
import { useLiveSessions } from "@/lib/sessions/use-live-sessions";

// What the badge says about the session's cards, one shape per meaning so it reads in grayscale too.
const statusBadge: Record<SessionStatus, { label: string; props: BadgeProps }> = {
  pending: { label: "Queued", props: { variant: "outline" } },
  processing: { label: "Making cards", props: { variant: "default" } },
  ready: { label: "Cards ready", props: { variant: "success" } },
  failed: { label: "Failed", props: { status: "fail" } },
};

/**
 * The sidebar's latest sessions, live. Each row: the title, then the repository (folder icon) and a badge saying
 * whether its cards are ready. Without `userId` the rows stay as rendered.
 */
export function NavSessions({
  sessions,
  userId,
}: {
  sessions: SessionListItem[];
  userId?: string | null;
}) {
  const pathname = usePathname();
  const { rows } = useLiveSessions(userId, sessions, { limit: 5 });
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
              const badge = statusBadge[session.status];
              return (
                <SidebarMenuItem key={session.id}>
                  <SidebarMenuButton
                    size="lg"
                    isActive={pathname === `/s/${session.id}`}
                    render={<Link href={`/s/${session.id}`} />}
                    // Native tooltip: the full title (it truncates) and what the second line means.
                    title={[name, session.repo && `Repository: ${session.repo}`, badge.label]
                      .filter(Boolean)
                      .join("\n")}
                  >
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate">{name}</span>
                      <span className="flex min-w-0 items-center gap-1.5 type-label-sm text-text-2">
                        {session.repo && (
                          <>
                            <FolderSimpleIcon aria-hidden className="shrink-0" />
                            <span className="sr-only">Repository:</span>
                            <span className="truncate">{session.repo}</span>
                          </>
                        )}
                        <span className="sr-only">Status:</span>
                        <Badge size="sm" {...badge.props}>
                          {badge.label}
                        </Badge>
                      </span>
                    </div>
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
