"use client";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { usePathname } from "next/navigation";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AppBreadcrumb } from "@/app/(app)/app-breadcrumb";
export function LearnerShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const focus = path === "/defend" || path.startsWith("/review/");
  if (focus)
    return (
      <div data-learning="" className="learning-focus-shell">
        <header className="learning-focus-header">
          <Link href="/dashboard" className="coach-focus-brand" aria-label="Session Coach">
            <BrandMark />
            <span>Session Coach</span>
          </Link>
          <div>
            <ThemeToggle />
            <Link href="/dashboard" className="learning-exit">
              ← Today
            </Link>
          </div>
        </header>
        <main id="main-content">{children}</main>
      </div>
    );
  return (
    <div data-learning="" className="learning-workspace-shell">
      <SidebarProvider>
        {sidebar}
        <SidebarInset>
          <header className="app-topbar">
            <SidebarTrigger />
            <AppBreadcrumb />
            <div className="learning-topbar-theme">
              <ThemeToggle />
            </div>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
