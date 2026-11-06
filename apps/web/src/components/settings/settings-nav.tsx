"use client";

import {
  LaptopIcon,
  MagnifyingGlassIcon,
  ShareNetworkIcon,
  SignOutIcon,
  SlidersHorizontalIcon,
  UserIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * The /settings sections in page order, grouped as the nav shows them. `id` is each section's anchor; `keywords` lets the
 * search find a section by what is inside it.
 */
const SETTINGS_GROUPS = [
  {
    label: "You",
    items: [
      {
        id: "profile",
        title: "Profile",
        icon: <UserIcon />,
        keywords: "name email time zone reminder",
      },
      { id: "devices", title: "Devices", icon: <LaptopIcon />, keywords: "computer cli token" },
    ],
  },
  {
    label: "Projects",
    items: [
      {
        id: "question-level",
        title: "Question level",
        icon: <SlidersHorizontalIcon />,
        keywords: "project repo hard simple",
      },
      {
        id: "report",
        title: "Share your report",
        icon: <ShareNetworkIcon />,
        keywords: "public link",
      },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "sign-out", title: "Sign out everywhere", icon: <SignOutIcon />, keywords: "session" },
      { id: "delete", title: "Delete account", icon: <WarningIcon />, keywords: "danger" },
    ],
  },
];

const ITEMS = SETTINGS_GROUPS.flatMap((group) => group.items);

/**
 * The left settings nav: a search that filters the links, then the grouped links to each section's anchor, the one in
 * view filled. Below md it is a select that jumps to the section, so the page never scrolls sideways at 375px.
 */
export function SettingsNav() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(ITEMS[0].id);

  // The link the learner clicked, kept at the end of the page, where the last short sections can't reach the line.
  const clicked = useRef<string | null>(null);

  useEffect(() => {
    // The section being read is the last one whose top has passed the upper third of the viewport.
    function onScroll(event: Event) {
      const scroller = event.target instanceof Element ? event.target : document.scrollingElement;
      const atEnd =
        scroller !== null &&
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
      if (atEnd && clicked.current) return;
      clicked.current = null;
      let current = ITEMS[0].id;
      for (const { id } of ITEMS) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= window.innerHeight / 3) current = id;
      }
      setActive(current);
    }
    // Capture: the page may scroll in the sidebar inset rather than the document.
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  const words = query.trim().toLowerCase();
  const groups = SETTINGS_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      `${item.title} ${item.keywords}`.toLowerCase().includes(words),
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Settings">
      <div className="md:hidden">
        <Select
          value={active}
          onValueChange={(id: string | null) => {
            if (!id) return;
            clicked.current = id;
            setActive(id);
            window.location.hash = id;
          }}
          items={ITEMS.map(({ id, title }) => ({ value: id, label: title }))}
        >
          <SelectTrigger aria-label="Jump to a section">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SETTINGS_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="hidden flex-col gap-2 md:flex">
        <InputGroup>
          <InputGroupAddon>
            <MagnifyingGlassIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Search settings"
            aria-label="Search settings"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </InputGroup>
        {groups.length === 0 && <p className="px-2 type-body-sm text-text-2">No settings match.</p>}
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={active === item.id}
                    render={<Link href={`#${item.id}`} />}
                    onClick={() => {
                      clicked.current = item.id;
                      setActive(item.id);
                    }}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </div>
    </nav>
  );
}
