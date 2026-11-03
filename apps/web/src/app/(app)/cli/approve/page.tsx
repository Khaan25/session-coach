import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Container } from "@/components/app/container";
import { ErrorState } from "@/components/app/error-state";
import { AppPageHeader } from "@/components/app/page-header";
import { ApproveRequest } from "@/components/cli/approve-request";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getCurrentUser } from "@/lib/auth/current-user";
import { userRateLimit } from "@/lib/auth/rate-limit";
import { formatRelativeTime } from "@/lib/relative-time";
import { codeState, formatUserCode, normalizeUserCode, type DeviceRow } from "@/lib/tokens/device";
import { findDeviceCode } from "@/lib/tokens/device-codes";

export const metadata: Metadata = { title: "Connect the CLI", robots: { index: false } };

/**
 * /cli/approve?code=XXXX-XXXX: the browser half of `session-coach login`. Signed-out visitors are sent to /login and
 * back (proxy). The code in the URL only fills the form and looks the request up; approving always takes a click.
 */
export default function CliApprovePage({ searchParams }: PageProps<"/cli/approve">) {
  return (
    <Container>
      <AppPageHeader
        title="Connect the CLI"
        description="Check the code matches the one in your terminal, then approve."
      />
      <Suspense fallback={<Spinner label="Loading the login request" />}>
        <Request searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

/** The code form: a plain GET back to this page, so it works before any JavaScript loads. */
function CodeForm({ code, error }: { code?: string; error?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Enter the code from your terminal</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action="/cli/approve" className="flex flex-col gap-4">
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="cli-code">Code</FieldLabel>
            <Input
              id="cli-code"
              name="code"
              defaultValue={code}
              placeholder="XXXX-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={9}
              aria-invalid={error ? true : undefined}
              required
            />
            <FieldDescription>
              {error ?? "session-coach login prints it, like WDJB-MJHT."}
            </FieldDescription>
          </Field>
          <div>
            <Button type="submit">Continue</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

async function Request({ searchParams }: Pick<PageProps<"/cli/approve">, "searchParams">) {
  const { code: raw } = await searchParams;
  const typed = typeof raw === "string" ? raw : undefined;
  if (!typed) return <CodeForm />;

  const userCode = normalizeUserCode(typed);
  if (!userCode) {
    return <CodeForm code={typed.slice(0, 9)} error="Codes are 8 letters, like WDJB-MJHT." />;
  }

  const user = await getCurrentUser();
  if (!user) return <CodeForm code={formatUserCode(userCode)} />;
  // Each lookup spends the same budget as approving, so this page can't be used to guess codes either.
  const limited = await userRateLimit("deviceDecide", user.id);
  if (limited) {
    return (
      <Card>
        <ErrorState
          variant="plain"
          status="warn"
          statusWord="Slow down"
          title="Too many codes"
          message={limited.message}
        />
      </Card>
    );
  }

  const loaded = await load(userCode);
  if (!loaded) {
    return (
      <Card>
        <ErrorState
          variant="plain"
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
      </Card>
    );
  }

  const { now, row } = loaded;
  if (!row) {
    return (
      <CodeForm
        code={formatUserCode(userCode)}
        error="No login has that code. Check your terminal, or run session-coach login again."
      />
    );
  }

  const state = codeState(row, now);
  if (state !== "pending") {
    const copy = {
      expired: {
        word: "Expired",
        title: "This code expired",
        message: "Run session-coach login again for a new one.",
      },
      approved: {
        word: "Approved",
        title: "Already approved",
        message: "Go back to your terminal; it signs in on its next check.",
      },
      used: {
        word: "Used",
        title: "Already used",
        message:
          "That login already has its token. Run session-coach login again to connect another computer.",
      },
      denied: {
        word: "Denied",
        title: "This login was denied",
        message: "Run session-coach login again if you meant to connect.",
      },
    }[state];
    return (
      <Card>
        <ErrorState
          variant="plain"
          status="warn"
          statusWord={copy.word}
          title={copy.title}
          message={copy.message}
        />
      </Card>
    );
  }

  return (
    <ApproveRequest
      request={{
        userCode: formatUserCode(row.user_code),
        clientName: row.client_name,
        requestedIp: row.requested_ip,
        requestedAgo: formatRelativeTime(row.requested_at, now) ?? "just now",
        secondsLeft: Math.ceil((Date.parse(row.expires_at) - now.getTime()) / 1000),
        expiresAt: row.expires_at,
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
