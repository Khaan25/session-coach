import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { initialsOf } from "@/lib/auth/initials";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProfile } from "@/lib/auth/profile";

import { type SiteNavUser, SiteNavAccount } from "./site-nav-account";
import { SiteNavBar } from "./site-nav-bar";

/**
 * The signed-in learner for the header, or null. It reads cookies, so it renders inside <Suspense> and only per
 * request: never prerendered or cached, so one learner's name can't reach another visitor (docs/plans/auth.md #20).
 */
async function SiteNavSession() {
  const claims = await getCurrentUser();
  let user: SiteNavUser | null = null;
  if (claims) {
    // A failed profile read still shows the account, by its email, rather than "Sign in".
    const profile = await getProfile().catch((error: unknown) => {
      console.error("SiteNav: getProfile", error);
      return null;
    });
    const email = profile?.email ?? claims.email ?? "";
    const name = profile?.display_name ?? (email.split("@")[0] || "Your account");
    user = { name, email, initials: initialsOf(profile?.display_name, email) };
  }
  return <SiteNavAccount user={user} />;
}

export function SiteNav() {
  return (
    <SiteNavBar
      account={
        <Suspense fallback={<Skeleton className="h-(--control) w-24" />}>
          <SiteNavSession />
        </Suspense>
      }
    />
  );
}
