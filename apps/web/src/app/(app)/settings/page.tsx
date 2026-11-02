import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { AppPageHeader } from "@/components/app/page-header";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsCard } from "@/components/settings/settings-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { getSettingsProfile, timeZoneOptions } from "@/lib/settings/profile";

import { signOutEverywhere } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Settings" };

type SettingsProfile = NonNullable<Awaited<ReturnType<typeof getSettingsProfile>>>;

// Only the skeleton's shape comes from this: a profile with every field filled.
const SAMPLE_PROFILE: SettingsProfile = {
  display_name: "Sam Rivera",
  email: "sam.rivera@example.com",
  timezone: "Europe/London",
  notify_email: true,
};

export default function SettingsPage() {
  return (
    <Container>
      <AppPageHeader title="Settings" description="Your profile, reminders and account." />
      {/* cacheComponents: the profile read uses cookies, so it streams inside Suspense. */}
      <MeasuredSuspense
        label="Loading your settings"
        skeleton={<SettingsView profile={SAMPLE_PROFILE} />}
      >
        <AccountSettings />
      </MeasuredSuspense>
    </Container>
  );
}

async function AccountSettings() {
  const profile = await getSettingsProfile();
  // Signed out: proxy.ts redirects to sign-in, so show nothing here.
  if (!profile) return null;
  return <SettingsView profile={profile} />;
}

function SettingsView({ profile }: { profile: SettingsProfile }) {
  // One block with the page's own gap: skullet wraps the skeleton in an element, so a fragment's cards would lose it.
  return (
    <div className="flex flex-col gap-6">
      <ProfileForm profile={profile} timezones={timeZoneOptions(profile.timezone)} />
      <SettingsCard
        title="Sign out everywhere"
        description="Signs you out on every browser and device, including this one."
      >
        <form action={signOutEverywhere}>
          <Button type="submit" variant="secondary" size="sm">
            Sign out everywhere
          </Button>
        </form>
      </SettingsCard>
      <SettingsCard
        title="CLI tokens"
        description="Create and revoke the tokens the CLI signs in with."
      >
        <Link href="/setup" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Manage tokens
        </Link>
      </SettingsCard>
      {/* Last on purpose: the destructive action ends the page. */}
      <SettingsCard
        title="Delete account"
        description="Deletes your sessions, cards, answers and tokens. It can't be undone."
      >
        <DeleteAccountDialog email={profile.email ?? ""} />
      </SettingsCard>
    </div>
  );
}
