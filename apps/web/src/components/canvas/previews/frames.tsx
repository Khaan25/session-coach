"use client";

// Full-page frames, so each canvas preview reads as the real route at desktop size: the (app) shell, the (auth) layout
// and the public pages, each under a slim browser bar with the URL.
//
// Reused as they are: the Sidebar* primitives, BrandMark, ThemeToggle, BrandLink and AuthArt. Rebuilt here with the
// same primitives and classes, because the production pieces can't run on a canvas: AppSidebar and NavUser import
// the sign-out Server Action, NavSessions subscribes to live sessions through Supabase, NavMain and AppBreadcrumb read
// the pathname, SiteNav reads the signed-in user, and the real Sidebar container is `fixed` at the viewport's height.

import {
  CaretRightIcon,
  CaretUpDownIcon,
  ChartLineUpIcon,
  ExamIcon,
  FolderSimpleIcon,
  GearIcon,
  SquaresFourIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";
import type { SessionStatus } from "@session-coach/shared/session";
import Link from "next/link";

import { AuthArt, type AuthScene } from "@/components/auth/auth-art";
import { BrandLink } from "@/components/auth/auth-parts";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

export type FrameNavItem = { title: string; url: string; icon: React.ReactNode };

/** The real sidebar's Learn group, from app-sidebar.tsx. */
export const LEARN_NAV: FrameNavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: <SquaresFourIcon /> },
  { title: "Review", url: "/review", icon: <ExamIcon /> },
  { title: "Progress", url: "/progress", icon: <ChartLineUpIcon /> },
  { title: "Setup", url: "/setup", icon: <TerminalWindowIcon /> },
  { title: "Settings", url: "/settings", icon: <GearIcon /> },
];

export type FrameSession = { id: string; title: string; repo: string; status: SessionStatus };

/** The recent sessions every static frame shows. The first one is the session the session previews open. */
export const FRAME_SESSIONS: FrameSession[] = [
  {
    id: "7f3a2c91",
    title: "Add rate limiting to the upload route",
    repo: "session-coach",
    status: "ready",
  },
  { id: "b81d0e44", title: "Write transcriptParser.ts", repo: "rapporteur", status: "processing" },
  { id: "c2e95a17", title: "Move email to Resend", repo: "session-coach", status: "failed" },
  { id: "0d4f6b38", title: "Stream the CLI upload", repo: "session-coach", status: "ready" },
];

export const FRAME_USER = { name: "Sam Rivera", detail: "sam@example.com", initials: "SR" };

// Copied from nav-sessions.tsx, which doesn't export it.
const statusBadge: Record<SessionStatus, { label: string; props: BadgeProps }> = {
  pending: { label: "Queued", props: { variant: "outline" } },
  processing: { label: "Making cards", props: { variant: "default" } },
  ready: { label: "Cards ready", props: { variant: "success" } },
  failed: { label: "Failed", props: { status: "fail" } },
};

/** A browser window: the URL bar, an optional bar under it, then the page filling the rest. */
function FrameWindow({
  path,
  bar,
  overlay,
  children,
}: {
  path: string;
  bar?: React.ReactNode;
  overlay?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-page">
      <div className="flex shrink-0 items-center gap-3 border-b border-hair bg-well px-4 py-2">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-cell-quiet" />
          <span className="size-2.5 rounded-full bg-cell-quiet" />
          <span className="size-2.5 rounded-full bg-cell-quiet" />
        </span>
        <span className="mx-auto w-full max-w-xl truncate rounded-soft bg-page px-3 py-1 text-center type-code-sm text-text-2">
          coach.ziaa.me{path}
        </span>
      </div>
      {bar}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {children}
        {overlay}
      </div>
    </div>
  );
}

/**
 * The (app) layout: the inset sidebar (brand, Learn nav, recent sessions, account) and the inset page with the
 * sidebar toggle and the breadcrumb. The active nav row, the breadcrumb and the active session all follow `path`, as
 * the real NavMain, AppBreadcrumb and NavSessions do. Pass `onNavigate` and `onOpenSession` to make the rows clickable.
 */
export function AppFrame({
  path,
  crumb,
  nav = LEARN_NAV,
  sessions = FRAME_SESSIONS,
  dueCount = 3,
  user = FRAME_USER,
  onNavigate,
  onOpenSession,
  bar,
  overlay,
  children,
}: {
  /** The route shown in the URL bar, e.g. `/dashboard` or `/s/7f3a2c91`. */
  path: string;
  /** The breadcrumb's page, for a proposed route that isn't in the nav. */
  crumb?: string;
  nav?: FrameNavItem[];
  sessions?: FrameSession[];
  dueCount?: number;
  user?: typeof FRAME_USER;
  onNavigate?: (url: string) => void;
  onOpenSession?: (id: string) => void;
  /** A bar between the URL bar and the app, such as the prototype's controls. */
  bar?: React.ReactNode;
  /** Drawn over the whole window, such as an open dialog. */
  overlay?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isActive = (url: string) => path === url || path.startsWith(`${url}/`);
  const title =
    crumb ??
    nav.find((item) => isActive(item.url))?.title ??
    (path.startsWith("/s/") ? "Session" : undefined);
  return (
    <FrameWindow path={path} bar={bar} overlay={overlay}>
      <SidebarProvider className="min-h-0 flex-1">
        <FrameSidebar
          nav={nav}
          isActive={isActive}
          activeSession={path.startsWith("/s/") ? path.slice(3) : null}
          sessions={sessions}
          dueCount={dueCount}
          user={user}
          onNavigate={onNavigate}
          onOpenSession={onOpenSession}
        />
        <SidebarInset className="overflow-y-auto">
          <header className="sticky top-0 z-10 flex h-(--topbar) shrink-0 items-center gap-2 bg-page px-(--gutter-sm) sm:px-(--gutter)">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:inline-flex">
                  <BreadcrumbLink
                    {...(onNavigate
                      ? {
                          render: <button type="button" />,
                          onClick: () => onNavigate("/dashboard"),
                        }
                      : { href: "/dashboard" })}
                  >
                    Session Coach
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {title && (
                  <>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </FrameWindow>
  );
}

/**
 * The inset sidebar in place: the same data attributes as the real Sidebar, so SidebarInset's peer styles apply, but
 * sized to the frame instead of `fixed` to the viewport. The toggle in the page header hides it, as the real one does.
 */
function FrameSidebar({
  nav,
  isActive,
  activeSession,
  sessions,
  dueCount,
  user,
  onNavigate,
  onOpenSession,
}: {
  nav: FrameNavItem[];
  isActive: (url: string) => boolean;
  activeSession: string | null;
  sessions: FrameSession[];
  dueCount: number;
  user: typeof FRAME_USER;
  onNavigate?: (url: string) => void;
  onOpenSession?: (id: string) => void;
}) {
  const { state } = useSidebar();
  return (
    <div
      data-slot="sidebar"
      data-state={state}
      data-collapsible={state === "collapsed" ? "offcanvas" : ""}
      data-variant="inset"
      data-side="left"
      className="group peer text-sidebar-foreground"
    >
      {state === "expanded" && (
        <div className="flex h-full w-(--sidebar-width) bg-surface p-2">
          <div data-sidebar="sidebar" className="flex size-full flex-col">
            <SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" onClick={() => onNavigate?.("/dashboard")}>
                    <BrandMark />
                    <span>Session Coach</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Learn</SidebarGroupLabel>
                <SidebarMenu>
                  {nav.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive(item.url)}
                        aria-current={isActive(item.url) ? "page" : undefined}
                        onClick={() => onNavigate?.(item.url)}
                      >
                        {item.icon}
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      {item.url === "/review" && dueCount > 0 ? (
                        <SidebarMenuBadge aria-label={`${dueCount} due today`}>
                          {dueCount}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
              {sessions.length > 0 && (
                <Collapsible defaultOpen render={<SidebarGroup />}>
                  <SidebarGroupLabel render={<CollapsibleTrigger />}>
                    Recent sessions
                    <CaretRightIcon className="ml-auto transition-transform in-data-panel-open:rotate-90 motion-reduce:transition-none" />
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {sessions.slice(0, 5).map((session) => {
                          const badge = statusBadge[session.status];
                          return (
                            <SidebarMenuItem key={session.id}>
                              <SidebarMenuButton
                                size="lg"
                                isActive={activeSession === session.id}
                                onClick={() => onOpenSession?.(session.id)}
                                title={`${session.title}\nRepository: ${session.repo}\n${badge.label}`}
                              >
                                <div className="grid min-w-0 flex-1 gap-0.5">
                                  <span className="truncate">{session.title}</span>
                                  <span className="flex min-w-0 items-center gap-1.5 type-label-sm text-text-2">
                                    <FolderSimpleIcon aria-hidden className="shrink-0" />
                                    <span className="sr-only">Repository:</span>
                                    <span className="truncate">{session.repo}</span>
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
              )}
            </SidebarContent>
            <SidebarFooter>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        size="lg"
                        aria-label={`Account menu for ${user.name}`}
                        onClick={() => onNavigate?.("/settings")}
                      >
                        <Avatar aria-hidden>
                          <AvatarFallback>{user.initials}</AvatarFallback>
                        </Avatar>
                        <div className="grid min-w-0 flex-1 text-start">
                          <span className="truncate">{user.name}</span>
                          <span className="truncate type-label-sm text-text-2">{user.detail}</span>
                        </div>
                        <CaretUpDownIcon className="ml-auto" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </div>
                <ThemeToggle />
              </div>
            </SidebarFooter>
          </div>
        </div>
      )}
    </div>
  );
}

/** The (auth) layout: the brand, the one form column and the footer links on the left, the scene's art on the right. */
export function AuthFrame({
  path,
  scene,
  children,
}: {
  path: string;
  scene: AuthScene;
  children: React.ReactNode;
}) {
  return (
    <FrameWindow path={path}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="grid min-h-full flex-1 bg-page lg:grid-cols-2">
          <div className="flex flex-col">
            <header className="flex h-18 items-center px-(--gutter-sm) sm:h-20 sm:px-(--gutter)">
              <BrandLink />
            </header>
            <main className="flex flex-1 flex-col justify-center">
              <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-(--gutter-sm) pt-16 pb-20 sm:px-(--gutter) sm:pt-24 sm:pb-30">
                {children}
              </div>
            </main>
            <footer className="px-(--gutter-sm) py-8 sm:px-(--gutter)">
              <ul className="flex justify-center gap-6">
                {["Privacy", "Terms", "Support"].map((label) => (
                  <li key={label}>
                    <Link
                      href={`/${label.toLowerCase()}`}
                      className="type-body-sm text-text-2 transition-colors duration-(--dur-fast) hover:text-text-1"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </footer>
          </div>
          <AuthArt scene={scene} />
        </div>
      </div>
    </FrameWindow>
  );
}

/** The marketing layout's header, signed out: brand, the three links, Sign in. Then the page. */
export function PublicFrame({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <FrameWindow path={path}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-page">
        <header>
          <nav
            aria-label="Main"
            className="mx-auto flex h-18 w-full max-w-(--container) items-center justify-between gap-6 px-(--gutter-sm) sm:h-20 sm:px-(--gutter)"
          >
            <BrandLink />
            <ul className="hidden items-center gap-8 md:flex">
              {[
                { href: "/how-it-works", label: "How it works" },
                { href: "/pricing", label: "Pricing" },
                { href: "/support", label: "Support" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="type-label text-text-2 transition-colors duration-(--dur-fast) hover:text-text-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/login" className={buttonVariants({ variant: "secondary" })}>
              Sign in
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </FrameWindow>
  );
}
