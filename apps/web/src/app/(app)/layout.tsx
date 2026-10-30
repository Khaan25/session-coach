import { Suspense } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { initialsOf } from "@/lib/auth/initials";
import { recentSessions } from "@/lib/sessions/queries";
import { getSettingsProfile } from "@/lib/settings/profile";

import { AppBreadcrumb } from "./app-breadcrumb";

// Reads the signed-in learner, so it renders inside Suspense (cacheComponents); the fallback is the same sidebar empty.
async function SignedInSidebar() {
  const user = await getCurrentUser();
  if (!user) return <AppSidebar sessions={[]} userId={null} user={null} />;
  const [sessions, profile] = await Promise.all([recentSessions(user.id), getSettingsProfile()]);
  const email = profile?.email ?? user.email;
  const name = profile?.display_name || email || "Learner";
  return (
    <AppSidebar
      sessions={sessions}
      userId={user.id}
      user={{
        name,
        detail: email ?? "",
        initials: initialsOf(profile?.display_name, email),
      }}
    />
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <Suspense fallback={<AppSidebar sessions={[]} userId={null} user={null} />}>
        <SignedInSidebar />
      </Suspense>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-(--topbar) shrink-0 items-center gap-2 bg-page px-(--gutter-sm) sm:px-(--gutter)">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <AppBreadcrumb />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
