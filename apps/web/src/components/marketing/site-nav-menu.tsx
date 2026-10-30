"use client";

import { ListIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** The nav links under `md`, where the inline list is hidden, so no link is lost on a phone. */
export function SiteNavMenu({ links }: { links: readonly { href: string; label: string }[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" />}
        aria-label="Menu"
        className="md:hidden"
      >
        <ListIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {links.map((link) => (
          <DropdownMenuLinkItem key={link.href} render={<Link href={link.href} />}>
            {link.label}
          </DropdownMenuLinkItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
