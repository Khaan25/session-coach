import type { Metadata } from "next";
import { Container } from "@/components/app/container";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import {
  SAMPLE_DEVICES,
  SAMPLE_PROFILE,
  SAMPLE_PROJECTS,
  SAMPLE_REPORT,
  SAMPLE_TIMEZONES,
} from "@/components/settings/settings-sample";
import { SettingsHeader, SettingsView } from "@/components/settings/settings-view";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listProjects, type ProjectListItem } from "@/lib/projects/queries";
import { formatRelativeTime } from "@/lib/relative-time";
import { getReportSettings } from "@/lib/report/queries";
import { getSettingsProfile, timeZoneOptions } from "@/lib/settings/profile";
import { listTokens } from "@/lib/tokens/queries";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Container>
      <SettingsHeader />
      {/* cacheComponents: the profile read uses cookies, so it streams inside Suspense. */}
      <MeasuredSuspense
        label="Loading your settings"
        skeleton={
          <SettingsView
            profile={SAMPLE_PROFILE}
            timezones={SAMPLE_TIMEZONES}
            projects={SAMPLE_PROJECTS}
            devices={SAMPLE_DEVICES}
            report={SAMPLE_REPORT}
          />
        }
      >
        <AccountSettings />
      </MeasuredSuspense>
    </Container>
  );
}

async function AccountSettings() {
  const [profile, projects, devices] = await Promise.all([
    getSettingsProfile(),
    loadProjects(),
    loadDevices(),
  ]);
  // Signed out: proxy.ts redirects to sign-in, so show nothing here.
  if (!profile) return null;
  const report = await loadReport(projects);
  return (
    <SettingsView
      profile={profile}
      timezones={timeZoneOptions(profile.timezone)}
      projects={projects}
      devices={devices}
      report={report}
    />
  );
}

/** The report settings, or null when the read failed, so the rest of the page still loads. */
async function loadReport(projects: ProjectListItem[] | null) {
  const user = await getCurrentUser();
  if (!user || !projects) return null;
  try {
    return await getReportSettings(
      user.id,
      projects.map((p) => p.repo),
    );
  } catch (error) {
    console.error("[settings/loadReport]", error instanceof Error ? error.message : error);
    return null;
  }
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

/**
 * The learner's devices (CLI tokens) with their times in words, or null when the read failed. Reads the clock outside
 * render (cacheComponents and the compiler's purity rule).
 */
async function loadDevices() {
  const user = await getCurrentUser();
  if (!user) return [];
  const now = new Date();
  try {
    const tokens = await listTokens(user.id);
    return tokens.map(({ id, label, created_at, last_used_at }) => ({
      id,
      label: label ?? "Unnamed computer",
      created: formatRelativeTime(created_at, now) ?? "None",
      lastUsed: last_used_at ? formatRelativeTime(last_used_at, now) : null,
    }));
  } catch (error) {
    console.error("[settings/loadDevices]", error instanceof Error ? error.message : error);
    return null;
  }
}
