"use client";

import { GearIcon, SignOutIcon, SquaresFourIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
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

export type SiteNavUser = { name: string; email: string; initials: string };

/**
 * The header's account corner: signed in, the dashboard and an avatar menu; signed out, sign in.
 * TODO(zia): the user comes from the Supabase session once auth lands (Phase 2).
 */
export function SiteNavAccount({ user }: { user: SiteNavUser | null }) {
  if (!user)
    return (
      <Link href="/login" className={buttonVariants({ variant: "secondary" })}>
        Sign in
      </Link>
    );

  return (
    <div className="flex items-center gap-2">
      <Link href="/dashboard" className={buttonVariants()}>
        Dashboard
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" />}
          aria-label={`Account menu for ${user.name}`}
        >
          <Avatar size="sm" aria-hidden>
            <AvatarFallback>{user.initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <span className="block truncate">{user.name}</span>
              <span className="block truncate">{user.email}</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLinkItem render={<Link href="/dashboard" />}>
            <SquaresFourIcon />
            Dashboard
          </DropdownMenuLinkItem>
          <DropdownMenuLinkItem render={<Link href="/settings" />}>
            <GearIcon />
            Settings
          </DropdownMenuLinkItem>
          <DropdownMenuSeparator />
          {/* TODO(zia): sign out through Supabase Auth (Phase 2). */}
          <DropdownMenuItem disabled>
            <SignOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
