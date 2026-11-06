import type { Metadata } from "next";

import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { AppPageHeader } from "@/components/app/page-header";
import { MembersView } from "@/components/members/members-view";
import { getCurrentUser } from "@/lib/auth/current-user";
import { initialsOf } from "@/lib/auth/initials";
import { getSettingsProfile } from "@/lib/settings/profile";

export const metadata: Metadata = { title: "Members" };

export default function MembersPage() {
  return (
    <Container>
      <AppPageHeader title="Members" description="The people who share your projects." />
      {/* cacheComponents: the user read uses cookies, so it streams inside Suspense. */}
      <MeasuredSuspense
        label="Loading members"
        skeleton={<MembersView name="Sam Rivera" email="sam@example.com" initials="SR" />}
      >
        <Members />
      </MeasuredSuspense>
    </Container>
  );
}

async function Members() {
  const user = await getCurrentUser();
  // Signed out: shows nothing. proxy.ts should send the visitor to sign-in first.
  if (!user) return null;
  const profile = await getSettingsProfile().catch((error: unknown) => {
    console.error("[members/getSettingsProfile]", error);
    return null;
  });
  const email = profile?.email ?? user.email;
  return (
    <MembersView
      name={profile?.display_name || email || "You"}
      email={email}
      initials={initialsOf(profile?.display_name, email)}
    />
  );
}
