"use client";

// Full-page frames, so each canvas preview reads as the real route at desktop size: the (app) shell, the (auth) layout
// and the public pages, each under a slim browser bar with the URL.
//
// Reused as they are: the Sidebar* primitives, the nav items, BrandMark, AuthShell, and SiteNavBar with
// SiteFooter. Only the (app) sidebar is rebuilt here, with the same primitives and classes, because the production
// pieces can't run on a canvas: AppSidebar and NavUser import the sign-out Server Action, NavMain and AppBreadcrumb
// read the pathname, and the real Sidebar container is `fixed` at the viewport's height.

import { CaretUpDownIcon } from "@phosphor-icons/react";

import { AuthShell } from "@/components/auth/auth-screens";
import { DryRunContext } from "@/components/app/dry-run";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNavAccount } from "@/components/marketing/site-nav-account";
import { SiteNavBar } from "@/components/marketing/site-nav-bar";
import { navMain, navOther } from "@/components/nav-items";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
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

const FRAME_USER = { name: "Sam Rivera", detail: "sam@example.com", initials: "SR" };

/** A browser window: the URL bar, then the page filling the rest. */
export function FrameWindow({
  path,
  overlay,
  children,
}: {
  path: string;
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
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Every real control drawn in a frame saves nothing: see DryRunContext. */}
        <DryRunContext value>{children}</DryRunContext>
        {overlay}
      </div>
    </div>
  );
}

/**
 * The (app) layout: the inset sidebar (brand, Learn nav, account) and the inset page with the sidebar toggle and the
 * breadcrumb. The active nav row and the breadcrumb follow `path`, as the real NavMain and AppBreadcrumb do.
 */
export function AppFrame({
  path,
  dueCount = 3,
  overlay,
  children,
}: {
  /** The route shown in the URL bar, e.g. `/dashboard` or `/review/c2`. */
  path: string;
  /** Cards due, on the Review row; 0 hides the badge. */
  dueCount?: number;
  /** Drawn over the whole window, such as an open dialog. */
  overlay?: React.ReactNode;
  children: React.ReactNode;
}) {
  const route = path.split("?")[0];
  const isActive = (url: string) => route === url || route.startsWith(`${url}/`);
  const title = [...navMain, ...navOther].find((item) => isActive(item.url))?.title;
  return (
    <FrameWindow path={path} overlay={overlay}>
      <SidebarProvider className="min-h-0 flex-1">
        <FrameSidebar isActive={isActive} dueCount={dueCount} />
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
                  <BreadcrumbLink href="/dashboard">Session Coach</BreadcrumbLink>
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
  isActive,
  dueCount,
}: {
  isActive: (url: string) => boolean;
  dueCount: number;
}) {
  const user = FRAME_USER;
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
                  <SidebarMenuButton size="lg">
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
                  {navMain.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive(item.url)}
                        aria-current={isActive(item.url) ? "page" : undefined}
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
            </SidebarContent>
            {/* As the real footer: one control, the account menu, which also holds the theme. */}
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" aria-label={`Account menu for ${user.name}`}>
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
            </SidebarFooter>
          </div>
        </div>
      )}
    </div>
  );
}

/** The (auth) and (standalone) layouts: the real AuthShell, one centred card over the brand bloom. */
export function AuthFrame({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <FrameWindow path={path}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <AuthShell>{children}</AuthShell>
      </div>
    </FrameWindow>
  );
}

/** The marketing layout, signed out: the real SiteNavBar with the signed-out corner, the page, the real footer. */
export function PublicFrame({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <FrameWindow path={path}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-page">
        <SiteNavBar account={<SiteNavAccount user={null} />} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </FrameWindow>
  );
}
