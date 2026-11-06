import { ShareNetworkIcon, SignOutIcon, WarningIcon } from "@phosphor-icons/react/ssr";

import { AppPageHeader } from "@/components/app/page-header";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { DevicesStep } from "@/components/settings/devices-step";
import { ProfileForm } from "@/components/settings/profile-form";
import { ProjectsCard } from "@/components/settings/projects-card";
import { ReportCard } from "@/components/settings/report-card";
import { SettingsRow } from "@/components/settings/settings-card";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SettingsSection } from "@/components/settings/settings-section";
import { SignOutEverywhereForm } from "@/components/settings/sign-out-everywhere";
import type { DeviceListRow } from "@/components/setup/device-section";
import type { ProjectListItem } from "@/lib/projects/queries";
import type { ReportSettings } from "@/lib/report/queries";

// /settings: the settings nav on the left (a select on a phone) and one card per section on the right, in the nav's
// order, the delete card last. One page with anchors, not a route per section: the sections are short, so they read
// best together, and search on the page still finds every field. Shared by the page, its skeleton and /canvas, which
// wraps it in DryRunContext so no control saves.

export type SettingsProfile = {
  display_name: string | null;
  email: string | null;
  timezone: string;
  notify_email: boolean;
};

export function SettingsHeader() {
  return (
    <AppPageHeader title="Settings" description="Your profile, computers, projects and account." />
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
  /** Null when the read failed: the section shows the error. */
  projects: ProjectListItem[] | null;
  devices: DeviceListRow[] | null;
  report: ReportSettings | null;
}) {
  // One block: skullet wraps the skeleton in an element, so a fragment's parts would lose the layout.
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <div className="md:sticky md:top-(--topbar) md:w-64 md:shrink-0">
        <SettingsNav />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <ProfileForm profile={profile} timezones={timezones} />
        <DevicesStep devices={devices} />
        <ProjectsCard projects={projects} />
        <SettingsSection
          id="report"
          icon={<ShareNetworkIcon />}
          title="Share your report"
          description="Nothing in the review loop. A public page of the decisions you own in the repos you tick, for a CV, a PR or a code review: each with one quote and the date you owned it. Never the why, the answer key, your answers or the session log."
        >
          <ReportCard report={report} />
        </SettingsSection>
        <SettingsSection
          id="sign-out"
          icon={<SignOutIcon />}
          title="Sign out everywhere"
          description="For a lost laptop or a shared computer."
        >
          <SettingsRow
            title="Every browser and device"
            description="Including this one. You sign in again on each."
          >
            <SignOutEverywhereForm />
          </SettingsRow>
        </SettingsSection>
        {/* Last on purpose: nothing destructive sits mid-page. */}
        <SettingsSection
          id="delete"
          icon={<WarningIcon />}
          title={<span className="text-fail-text">Delete your account</span>}
          description="Deleting can't be undone."
        >
          <SettingsRow
            title="Delete account and data"
            description="Deletes your sessions, cards, answers and tokens."
          >
            <DeleteAccountDialog email={profile.email ?? ""} />
          </SettingsRow>
        </SettingsSection>
      </div>
    </div>
  );
}
