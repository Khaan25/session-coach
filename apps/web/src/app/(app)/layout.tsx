import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { DetectTimezone } from "@/components/settings/detect-timezone";
import { SkipLink } from "@/components/skip-link";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { initialsOf } from "@/lib/auth/initials";
import { dueTodayCount } from "@/lib/review/queries";
import { getSettingsProfile } from "@/lib/settings/profile";

import { AppBreadcrumb } from "./app-breadcrumb";

function logAndReturn<T>(read: string, fallback: T) {
  return (error: unknown): T => {
    console.error(`(app)/layout: ${read}`, error);
    return fallback;
  };
}

// Reads the signed-in learner, so it renders inside Suspense (cacheComponents); the fallback is the same sidebar empty.
async function SignedInSidebar() {
  const user = await getCurrentUser();
  if (!user) return <AppSidebar dueCount={0} user={null} />;
  // Each read falls back on its own, so one failure leaves the shell and the page standing.
  const [profile, dueCount] = await Promise.all([
    getSettingsProfile().catch(logAndReturn("getSettingsProfile", null)),
    dueTodayCount(user.id).catch(logAndReturn("dueTodayCount", 0)),
  ]);
  const email = profile?.email ?? user.email;
  const name = profile?.display_name || email || "Learner";
  return (
    <>
      {profile?.timezone === "UTC" && <DetectTimezone />}
      <AppSidebar
        dueCount={dueCount}
        user={{
          name,
          detail: email ?? "",
          initials: initialsOf(profile?.display_name, email),
        }}
      />
    </>
  );
}

// App pages set a bare title ("Dashboard"); the brand follows it in the tab, like the marketing pages.
export const metadata: Metadata = {
  title: { template: "%s | Session Coach", default: "Session Coach" },
};

// Review cards slide on their own (components/review/card-transition.tsx), so the shell holds still for those types.
const shellFade = { forward: "none", back: "none", default: "route-fade" };

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <SkipLink />
      <Suspense fallback={<AppSidebar dueCount={0} user={null} />}>
        <SignedInSidebar />
      </Suspense>
      <SidebarInset id="main">
        <header className="sticky top-0 z-10 flex h-(--topbar) shrink-0 items-center gap-2 bg-page px-(--gutter-sm) sm:px-(--gutter)">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <AppBreadcrumb />
        </header>
        {/* Only the page content crossfades on a route change; the sidebar and topbar hold still. */}
        <ViewTransition default={shellFade}>{children}</ViewTransition>
      </SidebarInset>
    </SidebarProvider>
  );
}
