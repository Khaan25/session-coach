import { AppPageHeader } from "@/components/app/page-header";
import { ChecklistStep } from "@/components/settings/checklist-step";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { DevicesStep } from "@/components/settings/devices-step";
import { ProfileForm } from "@/components/settings/profile-form";
import { ProjectsCard } from "@/components/settings/projects-card";
import { ReportCard } from "@/components/settings/report-card";
import { SettingsCard } from "@/components/settings/settings-card";
import { SignOutEverywhereForm } from "@/components/settings/sign-out-everywhere";
import type { DeviceListRow } from "@/components/setup/device-section";
import { Separator } from "@/components/ui/separator";
import type { ProjectListItem } from "@/lib/projects/queries";
import type { ReportSettings } from "@/lib/report/queries";

// /settings as option A draws it (canvas: "Settings · A · Guided checklist"): numbered steps, each with what it
// changes, then the account actions apart. Shared by the page, its skeleton and /canvas, which wraps it in
// DryRunContext so no control saves.

export type SettingsProfile = {
  display_name: string | null;
  email: string | null;
  timezone: string;
  notify_email: boolean;
};

export function SettingsHeader() {
  return (
    <AppPageHeader
      title="Settings"
      description="Five things to check once. Each says what it changes in your reviews."
    />
  );
}

export function SettingsView({
  profile,
  timezones,
  projects,
  devices,
  report,
}: {
  profile: SettingsProfile;
  timezones: string[];
  /** Null when the read failed: the step shows the error. */
  projects: ProjectListItem[] | null;
  devices: DeviceListRow[] | null;
  report: ReportSettings | null;
}) {
  // One block with the page's own gap: skullet wraps the skeleton in an element, so a fragment's parts would lose it.
  // ProfileForm is steps 1 to 3 in its own form and list, so this list carries on from 4.
  return (
    <div className="flex flex-col gap-8">
      <ProfileForm profile={profile} timezones={timezones} />
      <ol start={4} className="flex flex-col gap-8">
        <ProjectsCard projects={projects} />
        <DevicesStep devices={devices} />
        {/* Shipped after the options were picked (#77), so option A has no step for it. */}
        <ChecklistStep
          n={6}
          title="Share your report"
          changes="Nothing in the review loop. It makes the decisions you own in the repos you tick readable at a public link, with their quotes; the why and your answers stay private."
        >
          <ReportCard report={report} />
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
          <SignOutEverywhereForm />
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
