import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { ProfileForm } from "@/components/settings/profile-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sampleProfile, sampleTimezones } from "@/lib/sample/account";

export const metadata: Metadata = { title: "Settings" };

// SAMPLE profile until Phase 2 and 8. TODO(zia): the signed-in learner's profile row.
export default function SettingsPage() {
  return (
    <Container>
      <AppPageHeader title="Settings" description="Your profile, reminders and account." />
      <ProfileForm profile={sampleProfile} timezones={sampleTimezones} />
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
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Delete account</h2>
          </CardTitle>
          <CardDescription>
            Deletes your sessions, cards, answers and tokens. It can&apos;t be undone.
          </CardDescription>
          <CardAction>
            <DeleteAccountDialog email={sampleProfile.email} />
          </CardAction>
        </CardHeader>
      </Card>
    </Container>
  );
}
