"use client";

import Link from "next/link";
import type { Session, SessionStatus } from "@session-coach/shared/session";
import { CaretRightIcon } from "@phosphor-icons/react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Status, type StatusValue } from "@/components/ui/status";

const statusOf: Record<SessionStatus, { status: StatusValue; label: string }> = {
  pending: { status: "queued", label: "Pending" },
  processing: { status: "running", label: "Processing" },
  ready: { status: "ok", label: "Ready" },
  failed: { status: "fail", label: "Failed" },
};

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
                    <span className="truncate">{session.title ?? "Untitled session"}</span>
                    <div className="flex min-w-0 items-center gap-2 type-label-sm text-text-2">
                      {session.repo && <span className="truncate">{session.repo}</span>}
                      <Status {...statusOf[session.status]} />
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
