"use client";

import { GearIcon, SignOutIcon, SquaresFourIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef } from "react";

import { signOut } from "@/app/(auth)/actions";
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
 */
export function SiteNavAccount({ user }: { user: SiteNavUser | null }) {
  const signOutRef = useRef<HTMLFormElement>(null);
  if (!user)
    return (
      <Link href="/login" className={buttonVariants({ variant: "secondary" })}>
        Sign in
      </Link>
    );

  return (
    <div className="flex items-center gap-2">
      {/* Sign-out is a POST, never a GET link (docs/plans/auth.md #26). The form sits outside the menu popup, which
      unmounts on close; the menu item submits it. */}
      <form ref={signOutRef} action={signOut} hidden />
      <Link href="/dashboard" className={buttonVariants()}>
        Dashboard
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-round" />}
          aria-label={`Account menu for ${user.name}`}
        >
          {/* Default size (32px, --control): the circle is as tall as the Dashboard button beside it. */}
          <Avatar aria-hidden>
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
          <DropdownMenuItem onClick={() => signOutRef.current?.requestSubmit()}>
            <SignOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
