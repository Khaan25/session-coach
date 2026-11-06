"use client";

// /setup as it ships (no redesign was picked for it): the real SetupView, SetupSteps and DeviceSection, fed synthetic rows
// the way app/(app)/setup/page.tsx feeds them. The frame's DryRunContext keeps Revoke from calling the route.

import { Container } from "@/components/app/container";
import { LoadFailedState } from "@/components/app/error-state";
import { DeviceSection, type DeviceListRow } from "@/components/setup/device-section";
import { RefreshButton } from "@/components/setup/refresh-button";
import { SetupSteps } from "@/components/setup/setup-steps";
import { SetupView } from "@/components/setup/setup-view";
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
        <SetupView
          steps={<SetupSteps progress={{ device, sessions: pushed ? 1 : 0 }} />}
          devices={
            state === "devices-failed" ? (
              <Card>
                <LoadFailedState noun="your devices" variant="plain" action={<RefreshButton />} />
              </Card>
            ) : (
              <DeviceSection
                initialTokens={device ? [{ ...DEVICE, lastUsed: pushed ? "just now" : null }] : []}
              />
            )
          }
        />
      </Container>
    </AppFrame>
  );
}
