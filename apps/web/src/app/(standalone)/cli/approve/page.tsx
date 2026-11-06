import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ApproveRequest } from "@/components/cli/approve-request";
import { ApproveCodeForm, ApproveNotice, SETTLED_COPY } from "@/components/cli/approve-states";
import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getCurrentUser } from "@/lib/auth/current-user";
import { userRateLimit } from "@/lib/auth/rate-limit";
import { formatRelativeTime } from "@/lib/relative-time";
import { codeState, formatUserCode, normalizeUserCode, type DeviceRow } from "@/lib/tokens/device";
import { findDeviceCode } from "@/lib/tokens/device-codes";

export const metadata: Metadata = {
  title: "Connect the CLI | Session Coach",
  robots: { index: false },
};

/**
 * /cli/approve?code=XXXX-XXXX: the browser half of `session-coach login`. Signed-out visitors are sent to /login and
 * back (proxy). The code in the URL only fills the form and looks the request up; approving always takes a click.
 */
export default function CliApprovePage({ searchParams }: PageProps<"/cli/approve">) {
  return (
    <Suspense fallback={<Spinner label="Loading the login request" />}>
      <Request searchParams={searchParams} />
    </Suspense>
  );
}

async function Request({ searchParams }: Pick<PageProps<"/cli/approve">, "searchParams">) {
  const { code: raw } = await searchParams;
  const typed = typeof raw === "string" ? raw : undefined;
  if (!typed) return <ApproveCodeForm />;

  const userCode = normalizeUserCode(typed);
  if (!userCode) {
    return (
      <ApproveCodeForm code={typed.slice(0, 9)} error="Codes are 8 letters, like WDJB-MJHT." />
    );
  }

  const user = await getCurrentUser();
  if (!user) return <ApproveCodeForm code={formatUserCode(userCode)} />;
  // Each lookup spends the same budget as approving, so this page can't be used to guess codes either.
  const limited = await userRateLimit("deviceDecide", user.id);
  if (limited) {
    return <ApproveNotice word="Slow down" title="Too many codes" message={limited.message} />;
  }

  const loaded = await load(userCode);
  if (!loaded) {
    return (
      <ApproveNotice
        title="Couldn't look up that code"
        message="Reload the page to try again."
        action={
          <Link
            href={`/cli/approve?code=${formatUserCode(userCode)}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Try again
          </Link>
        }
      />
    );
  }

  const { now, row } = loaded;
  if (!row) {
    return (
      <ApproveCodeForm
        code={formatUserCode(userCode)}
        error="No login has that code. Check your terminal, or run session-coach login again."
      />
    );
  }

  const state = codeState(row, now);
  if (state !== "pending") return <ApproveNotice {...SETTLED_COPY[state]} />;

  return (
    <ApproveRequest
      request={{
        userCode: formatUserCode(row.user_code),
        clientName: row.client_name,
        requestedIp: row.requested_ip,
        requestedAgo: formatRelativeTime(row.requested_at, now) ?? "just now",
        secondsLeft: Math.ceil((Date.parse(row.expires_at) - now.getTime()) / 1000),
      }}
    />
  );
}

/** Reads the clock outside render, then the code; null when the read fails (logged, not shown). */
async function load(userCode: string): Promise<{ now: Date; row: DeviceRow | null } | null> {
  const now = new Date();
  try {
    return { now, row: await findDeviceCode(userCode) };
  } catch (err) {
    console.error("[cli/approve] lookup failed", err instanceof Error ? err.message : err);
    return null;
  }
}
