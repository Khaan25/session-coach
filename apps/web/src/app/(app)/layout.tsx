import { DetectTimezone } from "@/components/settings/detect-timezone";
import { Suspense } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { LearnerShell } from "@/components/app/learner-shell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { initialsOf } from "@/lib/auth/initials";
import { dueTodayCount } from "@/lib/review/queries";
import { recentSessions } from "@/lib/sessions/queries";
import { getSettingsProfile } from "@/lib/settings/profile";

function logAndReturn<T>(read: string, fallback: T) {
  return (error: unknown): T => {
    console.error(`(app)/layout: ${read}`, error);
    return fallback;
  };
}

// Reads the signed-in learner, so it renders inside Suspense (cacheComponents); the fallback is the same sidebar empty.
async function SignedInSidebar() {
  const user = await getCurrentUser();
  if (!user) return <AppSidebar sessions={[]} dueCount={0} userId={null} user={null} />;
  // Each read falls back on its own, so one failure leaves the shell and the page standing.
  const [sessions, profile, dueCount] = await Promise.all([
    recentSessions(user.id).catch(logAndReturn("recentSessions", [])),
    getSettingsProfile().catch(logAndReturn("getSettingsProfile", null)),
    dueTodayCount(user.id).catch(logAndReturn("dueTodayCount", 0)),
  ]);
  const email = profile?.email ?? user.email;
  const name = profile?.display_name || email || "Learner";
  return (
    <>
      {profile?.timezone === "UTC" && <DetectTimezone />}
      <AppSidebar
        sessions={sessions}
        dueCount={dueCount}
        userId={user.id}
        user={{
          name,
          detail: email ?? "",
          initials: initialsOf(profile?.display_name, email),
        }}
      />
    </>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <LearnerShell
      sidebar={
        <Suspense fallback={<AppSidebar sessions={[]} dueCount={0} userId={null} user={null} />}>
          <SignedInSidebar />
        </Suspense>
      }
    >
      {children}
    </LearnerShell>
  );
}
