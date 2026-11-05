import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { AppPageHeader } from "@/components/app/page-header";
import { ChecklistStep } from "@/components/settings/checklist-step";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { ProfileForm } from "@/components/settings/profile-form";
import { ProjectsCard } from "@/components/settings/projects-card";
import { SettingsCard } from "@/components/settings/settings-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listProjects, type ProjectListItem } from "@/lib/projects/queries";
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
const SAMPLE_PROJECTS: ProjectListItem[] = [
  { repo: "acme/web", question_level: "simple", onboarded: true },
  { repo: "acme/api", question_level: "hard", onboarded: true },
];

export default function SettingsPage() {
  return (
    <Container>
      <AppPageHeader
        title="Settings"
        description="Five things to check once. Each says what it changes in your reviews."
      />
      {/* cacheComponents: the profile read uses cookies, so it streams inside Suspense. */}
      <MeasuredSuspense
        label="Loading your settings"
        skeleton={<SettingsView profile={SAMPLE_PROFILE} projects={SAMPLE_PROJECTS} />}
      >
        <AccountSettings />
      </MeasuredSuspense>
    </Container>
  );
}

async function AccountSettings() {
  const [profile, projects] = await Promise.all([getSettingsProfile(), loadProjects()]);
  // Signed out: proxy.ts redirects to sign-in, so show nothing here.
  if (!profile) return null;
  return <SettingsView profile={profile} projects={projects} />;
}

/** The learner's projects, or null when the read failed, so the profile still loads and the card shows the error. */
async function loadProjects() {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    return await listProjects(user.id);
  } catch (error) {
    console.error("[settings/loadProjects]", error);
    return null;
  }
}

function SettingsView({
  profile,
  projects,
}: {
  profile: SettingsProfile;
  projects: ProjectListItem[] | null;
}) {
  // One block with the page's own gap: skullet wraps the skeleton in an element, so a fragment's parts would lose it.
  // ProfileForm is steps 1 to 3 in its own form and list, so this list carries on from 4.
  return (
    <div className="flex flex-col gap-8">
      <ProfileForm profile={profile} timezones={timeZoneOptions(profile.timezone)} />
      <ol start={4} className="flex flex-col gap-8">
        <ProjectsCard projects={projects} />
        <ChecklistStep
          n={5}
          title="CLI tokens"
          changes="Each computer pushes sessions with the token it signed in with. Revoke one and that computer can't push until you run npx session-coach login there again."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-body-sm text-text-2">
              Create and revoke the tokens the CLI signs in with.
            </p>
            <Link href="/setup" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Manage tokens
            </Link>
          </div>
        </ChecklistStep>
      </ol>
      <Separator />
      {/* Apart from the checklist on purpose: nothing destructive sits mid-list, and delete ends the page. */}
      <section aria-labelledby="settings-account" className="flex flex-col gap-6">
        <h2 id="settings-account" skullet-own="" className="type-heading-sm text-text-1">
          Account
        </h2>
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
          title="Delete account"
          description="Deletes your sessions, cards, answers and tokens. It can't be undone."
        >
          <DeleteAccountDialog email={profile.email ?? ""} />
        </SettingsCard>
      </section>
    </div>
  );
}
