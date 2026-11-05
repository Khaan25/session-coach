"use client";

// The picked /cli/approve, option C: the real ApproveRequest (components/cli/approve-request.tsx) in the page's column,
// fed a synthetic login. The frame's DryRunContext shows the answer without calling the route.

import { ApproveRequest } from "@/components/cli/approve-request";
import { ApproveColumn } from "@/components/cli/approve-states";

import { AppFrame } from "../frames";
import { DEVICE_CODE } from "../prototype-data";

export function OnboardingCliApproveOptionC() {
  return (
    <AppFrame path={`/cli/approve?code=${DEVICE_CODE}`} sessions={[]} dueCount={0}>
      <ApproveColumn>
        <ApproveRequest
          request={{
            userCode: DEVICE_CODE,
            clientName: "sams-mbp (macOS)",
            requestedIp: "203.0.113.24",
            requestedAgo: "1 minute ago",
            secondsLeft: 522,
          }}
        />
      </ApproveColumn>
    </AppFrame>
  );
}
