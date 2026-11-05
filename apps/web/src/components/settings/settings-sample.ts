// A synthetic learner's settings: /settings's loading skeleton draws its shape from them, and /canvas draws the page
// with them. No real account.

import type { SettingsProfile } from "@/components/settings/settings-view";
import type { DeviceListRow } from "@/components/setup/device-section";
import type { ProjectListItem } from "@/lib/projects/queries";
import type { ReportSettings } from "@/lib/report/queries";

export const SAMPLE_PROFILE: SettingsProfile = {
  display_name: "Sam Rivera",
  email: "sam@example.com",
  timezone: "Asia/Karachi",
  notify_email: true,
};

export const SAMPLE_TIMEZONES = ["Asia/Karachi", "Europe/London", "America/New_York", "UTC"];

export const SAMPLE_PROJECTS: ProjectListItem[] = [
  { repo: "session-coach", question_level: "hard", onboarded: true },
  { repo: "rapporteur", question_level: "simple", onboarded: false },
];

export const SAMPLE_DEVICES: DeviceListRow[] = [
  { id: "sample-0", label: "sams-mbp (macOS)", created: "3 days ago", lastUsed: "12 minutes ago" },
  { id: "sample-1", label: "work-desktop (Linux)", created: "2 weeks ago", lastUsed: "6 days ago" },
];

export const SAMPLE_REPORT: ReportSettings = { on: false, slug: "0".repeat(32), repos: [] };
