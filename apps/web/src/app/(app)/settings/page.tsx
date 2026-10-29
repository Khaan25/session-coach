import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { ProfileForm } from "@/components/settings/profile-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>CLI tokens</h2>
          </CardTitle>
          <CardDescription>Create and revoke the tokens the CLI signs in with.</CardDescription>
          <CardAction>
            <Link href="/setup" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Manage tokens
            </Link>
          </CardAction>
        </CardHeader>
      </Card>
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
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Sign out everywhere</h2>
          </CardTitle>
          <CardDescription>
            Signs you out on every browser and device, including this one.
          </CardDescription>
          <CardAction>
            <form action={signOutEverywhere}>
              <Button type="submit" variant="secondary" size="sm">
                Sign out everywhere
              </Button>
            </form>
          </CardAction>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Delete account</h2>
          </CardTitle>
          <CardDescription>
            Deletes your sessions, cards, answers and tokens. It can&apos;t be undone.
          </CardDescription>
          <CardAction>
            <DeleteAccountDialog email={profile.email ?? ""} />
          </CardAction>
        </CardHeader>
      </Card>
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
    </div>
  );
}
