"use client";

import Link from "next/link";
import type { Session } from "@session-coach/shared/session";
import { CaretRightIcon } from "@phosphor-icons/react";

import { StatusBadge } from "@/components/app/status-badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavSessions({ sessions }: { sessions: Session[] }) {
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
            {sessions.map((session) => (
              <SidebarMenuItem key={session.id}>
                <SidebarMenuButton size="lg" render={<Link href={`/s/${session.id}`} />}>
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate">
                      {session.title ||
                        [session.repo, session.branch].filter(Boolean).join(" on ") ||
                        "Untitled session"}
                    </span>
                    <div className="flex min-w-0 items-center gap-2 type-label-sm text-text-2">
                      {session.repo && <span className="truncate">{session.repo}</span>}
                      <StatusBadge status={session.status} />
                    </div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </CollapsibleContent>
    </Collapsible>
  );
}
