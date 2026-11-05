"use client";

// The picked Settings, option A: the real SettingsView (components/settings/settings-view.tsx) that /settings renders,
// fed the synthetic learner in settings-sample.ts, inside DryRunContext so no control saves, revokes or signs out.

import { Container } from "@/components/app/container";
import { DryRunContext } from "@/components/app/dry-run";
import {
  SAMPLE_DEVICES,
  SAMPLE_PROFILE,
  SAMPLE_PROJECTS,
  SAMPLE_REPORT,
  SAMPLE_TIMEZONES,
} from "@/components/settings/settings-sample";
import { SettingsHeader, SettingsView } from "@/components/settings/settings-view";

import { AppFrame } from "../frames";

export function ProgressSettingsSettingsOptionA({
  overlay,
}: {
  /** Drawn over the window, such as the delete dialog or the saved toast. */
  overlay?: React.ReactNode;
} = {}) {
  return (
    <AppFrame path="/settings" overlay={overlay}>
      <DryRunContext value>
        <Container>
          <SettingsHeader />
          <SettingsView
            profile={SAMPLE_PROFILE}
            timezones={SAMPLE_TIMEZONES}
            projects={SAMPLE_PROJECTS}
            devices={SAMPLE_DEVICES}
            report={SAMPLE_REPORT}
          />
        </Container>
      </DryRunContext>
    </AppFrame>
  );
}
