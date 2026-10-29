import sample from "@session-coach/shared/fixtures/session.sample.json";
import { sessionSchema } from "@session-coach/shared/session";

import { AppSidebar } from "@/components/app-sidebar";
import { sampleUser } from "@/lib/sample/account";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toast";

import { AppBreadcrumb } from "./app-breadcrumb";

// TODO(zia): the learner's recent sessions from Supabase (Phase 4); the fixture stands in until then.
const sessions = [sessionSchema.parse(sample.session)];

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Toaster>
      <SidebarProvider>
        <AppSidebar
          sessions={sessions}
          // SAMPLE: TODO(zia): the signed-in profile (Phase 2).
          user={{ name: sampleUser.name, detail: sampleUser.email, initials: sampleUser.initials }}
        />
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
    </Toaster>
  );
}
