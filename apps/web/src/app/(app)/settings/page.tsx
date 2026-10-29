import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsCard } from "@/components/settings/settings-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSettingsProfile, timeZoneOptions } from "@/lib/settings/profile";

import { signOutEverywhere } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Container>
      <AppPageHeader title="Settings" description="Your profile, reminders and account." />
      {/* cacheComponents: the profile read uses cookies, so it streams inside Suspense. */}
      <Suspense fallback={<SettingsLoading />}>
        <AccountSettings />
      </Suspense>
    </Container>
  );
}

async function AccountSettings() {
  const profile = await getSettingsProfile();
  // Signed out: proxy.ts redirects to sign-in, so show nothing here.
  if (!profile) return null;
  return (
    <>
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
    </>
  );
}

function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <output className="sr-only">Loading your settings</output>
      <Skeleton aria-hidden className="h-96" />
      <Skeleton aria-hidden className="h-24" />
      <Skeleton aria-hidden className="h-24" />
      <Skeleton aria-hidden className="h-24" />
    </div>
  );
}
