import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { Container } from "@/components/app/container";
import { LoadFailedState } from "@/components/app/error-state";
import { MeasuredSuspense } from "@/components/app/measured-suspense";
import { RefreshButton } from "@/components/setup/refresh-button";
import { SetupSteps } from "@/components/setup/setup-steps";
import { SetupView } from "@/components/setup/setup-view";
import { DeviceSection, type DeviceListRow } from "@/components/setup/device-section";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/relative-time";
import { listTokens, type TokenRow } from "@/lib/tokens/queries";

export const metadata: Metadata = { title: "Setup" };

// Only the skeleton's shape comes from these: two computers, one never used.
const SAMPLE_DEVICES: DeviceListRow[] = [
  { id: "sample-0", label: "sams-mbp (macOS)", created: "3 days ago", lastUsed: "2 hours ago" },
  { id: "sample-1", label: "home-desktop (Linux)", created: "2 weeks ago", lastUsed: null },
];

export default function SetupPage() {
  return (
    <Container>
      <SetupView
        steps={
          <Suspense fallback={<SetupSteps />}>
            <Steps />
          </Suspense>
        }
        devices={
          <MeasuredSuspense
            label="Loading your devices"
            skeleton={<DeviceSection initialTokens={SAMPLE_DEVICES} />}
          >
            <Devices />
          </MeasuredSuspense>
        }
      />
    </Container>
  );
}

// Reads the signed-in learner's devices (CLI tokens) through RLS, so it renders inside Suspense (cacheComponents).
async function Devices() {
  const user = await getCurrentUser();
  if (!user) return <DeviceSection initialTokens={[]} />;
  const loaded = await load(user.id);
  if (!loaded) {
    return (
      <Card>
        <LoadFailedState noun="your devices" variant="plain" action={<RefreshButton />} />
      </Card>
    );
  }
  const { now, tokens } = loaded;
  return (
    <DeviceSection
      initialTokens={tokens.map(({ id, label, created_at, last_used_at }) => ({
        id,
        label: label ?? "Unnamed computer",
        created: formatRelativeTime(created_at, now) ?? "None",
        lastUsed: last_used_at ? formatRelativeTime(last_used_at, now) : null,
      }))}
    />
  );
}

// Steps and Devices both read the tokens; cache() makes that one query per request.
const load = cache(loadTokens);

// Marks steps 1 and 3 done when the page can see them. Falls back to no marks, never an error: the steps still work.
async function Steps() {
  const user = await getCurrentUser();
  if (!user) return <SetupSteps />;
  const [loaded, sessions] = await Promise.all([load(user.id), countSessions(user.id)]);
  const newest = loaded?.tokens[0];
  const device = newest ? (newest.label ?? "Unnamed computer") : null;
  return <SetupSteps progress={{ device, sessions }} />;
}

/** How many sessions the learner has uploaded, as a head count through RLS; null when the read fails (logged). */
async function countSessions(userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    console.error("[setup] session count failed", error.message);
    return null;
  }
  return count;
}

/** Reads the clock outside render, then the tokens; null when the read fails (logged, not shown). */
async function loadTokens(userId: string): Promise<{ now: Date; tokens: TokenRow[] } | null> {
  const now = new Date();
  try {
    return { now, tokens: await listTokens(userId) };
  } catch (err) {
    console.error("[setup] token list failed", err instanceof Error ? err.message : err);
    return null;
  }
}
