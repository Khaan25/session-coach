"use client";

// /setup as it ships (no redesign was picked for it): the real AiSetupCard, SetupSteps and DeviceSection, fed synthetic
// rows the way app/(app)/setup/page.tsx feeds them. Nothing here fetches until someone presses Rename or Disconnect.

import { Container } from "@/components/app/container";
import { LoadFailedState } from "@/components/app/error-state";
import { AppPageHeader } from "@/components/app/page-header";
import { AiSetupCard } from "@/components/setup/ai-setup-card";
import { DeviceSection, type DeviceListRow } from "@/components/setup/device-section";
import { SetupSteps } from "@/components/setup/setup-steps";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { AppFrame, FRAME_SESSIONS } from "../frames";

export type SetupState = "no-device" | "device" | "first-push" | "devices-failed";

const DEVICE: DeviceListRow = {
  id: "map-device-0",
  label: "sams-mbp (macOS)",
  created: "2 minutes ago",
  lastUsed: null,
};

export function MapSetup({ state }: { state: SetupState }) {
  const device = state === "device" || state === "first-push" ? DEVICE.label : null;
  const pushed = state === "first-push";
  return (
    <AppFrame
      path="/setup"
      sessions={pushed ? [{ ...FRAME_SESSIONS[0], status: "processing" }] : []}
      dueCount={0}
    >
      <Container>
        <AppPageHeader
          title="Setup"
          description="Connect Claude Code, so each session you finish becomes decision cards. Let your AI run the setup, or follow the steps by hand."
        />
        <AiSetupCard />
        <SetupSteps progress={{ device, sessions: pushed ? 1 : 0 }} />
        {state === "devices-failed" ? (
          <Card>
            <LoadFailedState
              noun="your devices"
              variant="plain"
              action={<Button variant="secondary">Try again</Button>}
            />
          </Card>
        ) : (
          <DeviceSection
            initialTokens={device ? [{ ...DEVICE, lastUsed: pushed ? "just now" : null }] : []}
          />
        )}
      </Container>
    </AppFrame>
  );
}
