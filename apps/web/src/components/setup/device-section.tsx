"use client";

import { LaptopIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { useDryRun } from "@/components/app/dry-run";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";

/** A device (one CLI token) with its times already written as words by the server. */
export type DeviceListRow = { id: string; label: string; created: string; lastUsed: string | null };

/** The error message a failed route returns, or a generic one when there is no answer at all. */
async function errorOf(response: Response | null) {
  const body: { error?: string } | null = await response?.json().catch(() => null);
  return body?.error ?? "Check your connection and try again.";
}

/**
 * Connected devices: every computer the CLI signed in on is one cli_tokens row, named by `session-coach login` (its
 * hostname and OS). Each row revokes through DELETE /api/cli/tokens?id= after a confirm. "Use a token instead" calls
 * POST /api/cli/tokens and shows the raw token once, for `session-coach login --token`.
 */
export function DeviceSection({ initialTokens }: { initialTokens: DeviceListRow[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  return (
    <Card>
      <CardHeader>
        {/* skullet-own: static text stays real in the skeleton; only the tokens are drawn as bars. */}
        <CardTitle skullet-own="">
          <h2>Connected devices</h2>
        </CardTitle>
        <CardDescription skullet-own="">
          Each computer you run session-coach login on shows up here. Revoke one to sign it out.
        </CardDescription>
        <CardAction>
          <CreateTokenDialog
            onCreate={(row) => {
              setTokens((rows) => [row, ...rows]);
              toast.add({ type: "success", title: "Token created", description: row.label });
            }}
          />
        </CardAction>
      </CardHeader>
      {tokens.length > 0 ? (
        <ItemGroup>
          {tokens.map((token) => (
            // ItemGroup is a div with role="list" (see ui/item.tsx), so the row takes the matching role.
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            <Item key={token.id} role="listitem">
              <ItemMedia variant="icon">
                <LaptopIcon aria-hidden="true" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{token.label}</ItemTitle>
                <ItemDescription>
                  <span className="flex flex-wrap gap-x-3">
                    <span>Created {token.created}</span>
                    <span>{token.lastUsed ? `Last used ${token.lastUsed}` : "Never used"}</span>
                  </span>
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <RevokeTokenDialog
                  id={token.id}
                  label={token.label}
                  onRevoke={() => setTokens((rows) => rows.filter(({ id }) => id !== token.id))}
                />
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      ) : (
        <EmptyState
          variant="plain"
          title="No computer connected yet"
          description="Copy the setup prompt into your agent, or run npx session-coach login yourself."
        />
      )}
    </Card>
  );
}

function CreateTokenDialog({ onCreate }: { onCreate: (row: DeviceListRow) => void }) {
  const id = useId();
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  // The raw token, held only while the dialog is open.
  const [token, setToken] = useState<string | null>(null);
  const dryRun = useDryRun();

  async function create() {
    // /canvas: no token is made for whoever is looking; the dialog shows where the token would be.
    if (dryRun) return setToken("A new token shows here once, on the real page.");
    setPending(true);
    const response = await fetch("/api/cli/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() }),
    }).catch(() => null);
    if (!response?.ok) {
      setPending(false);
      toast.add({
        type: "error",
        title: "Your token wasn't created",
        description: await errorOf(response),
      });
      return;
    }
    const created: { id: string; label: string | null; token: string } = await response.json();
    setPending(false);
    setToken(created.token);
    onCreate({
      id: created.id,
      label: created.label ?? "Unnamed computer",
      created: "now",
      lastUsed: null,
    });
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        // The token is gone once the dialog closes; the next open starts a new one.
        if (!open) {
          setToken(null);
          setLabel("");
        }
      }}
    >
      <DialogTrigger render={<Button variant="secondary" size="sm" />}>
        Use a token instead
      </DialogTrigger>
      <DialogContent>
        {token ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your token</DialogTitle>
              <DialogDescription>
                It won&apos;t be shown again. Only a hash of it is stored, so if you lose it, revoke
                it and create a new one. Run the command below and paste it when asked.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <CodeBlock variant="command" command={token} prompt="" copyLabel="Copy token" />
              <CodeBlock variant="command" command="npx session-coach login --token" />
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button />}>Done</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <DialogHeader>
              <DialogTitle>Create a CLI token</DialogTitle>
              <DialogDescription>
                For a computer where the browser approval can&apos;t work. The CLI uses it to upload
                your sessions.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <Field>
                <FieldLabel htmlFor={`${id}-label`}>Label</FieldLabel>
                <Input
                  id={`${id}-label`}
                  value={label}
                  maxLength={100}
                  disabled={pending}
                  onChange={(event) => setLabel(event.target.value)}
                />
                <FieldDescription>
                  Name the computer it is for, so you know which one to revoke.
                </FieldDescription>
              </Field>
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button variant="secondary" />} disabled={pending}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={pending} aria-busy={pending}>
                {pending && <Spinner label="" />}
                Create token
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Revoke one device's token after a confirm. `verb` names the button: Revoke on /setup, Disconnect on /settings. Under
 * DryRunContext (/canvas) the row goes without calling the route.
 */
export function RevokeTokenDialog({
  id,
  label,
  onRevoke,
  verb = "Revoke",
}: {
  id: string;
  label: string;
  onRevoke: () => void;
  verb?: "Revoke" | "Disconnect";
}) {
  const [pending, setPending] = useState(false);
  const dryRun = useDryRun();

  async function revoke() {
    if (dryRun) return onRevoke();
    setPending(true);
    const response = await fetch(`/api/cli/tokens?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => null);
    setPending(false);
    // 404: already gone (revoked in another tab), so the row goes either way.
    if (response?.ok || response?.status === 404) {
      onRevoke();
      toast.add({ title: "Device revoked", description: `${label} is signed out.` });
      return;
    }
    toast.add({
      type: "error",
      title: `${label} wasn't revoked`,
      description: await errorOf(response),
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant={verb === "Revoke" ? "ghost" : "secondary"}
            size="sm"
            disabled={pending}
            aria-busy={pending}
          />
        }
      >
        {pending && <Spinner label="" />}
        {verb}
        <span className="sr-only"> {label}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This computer can&apos;t upload sessions until you run session-coach login on it again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => void revoke()}>
            Revoke
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
