"use client";

import Link from "next/link";
import { CaretUpDownIcon, GearIcon, SignOutIcon } from "@phosphor-icons/react";

import { signOut } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavUser({ user }: { user: { name: string; detail: string; initials: string } }) {
  const { isMobile } = useSidebar();
  const who = (
    <>
      <Avatar aria-hidden>
        <AvatarFallback>{user.initials}</AvatarFallback>
      </Avatar>
      <div className="grid min-w-0 flex-1 text-start">
        <span className="truncate">{user.name}</span>
        <span className="truncate type-label-sm text-text-2">{user.detail}</span>
      </div>
    </>
  );
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* Sign-out is a POST, never a GET link (docs/plans/auth.md #26). The form sits outside the menu popup, which
        unmounts on close; the menu item is a submit button tied to it by `form`. */}
        <form id="sidebar-sign-out" action={signOut} hidden />
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            {who}
            <CaretUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex items-center gap-2">{who}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLinkItem render={<Link href="/settings" />}>
              <GearIcon />
              Settings
            </DropdownMenuLinkItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<button type="submit" form="sidebar-sign-out" />}>
              <SignOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
