"use client";

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
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

/** A token row with its times already written as words by the server. */
export type TokenListRow = { id: string; label: string; created: string; lastUsed: string | null };

/** The error message a failed route returns, or a generic one when there is no answer at all. */
async function errorOf(response: Response | null) {
  const body: { error?: string } | null = await response?.json().catch(() => null);
  return body?.error ?? "Check your connection and try again.";
}

/**
 * CLI tokens: "Create token" calls POST /api/cli/tokens and shows the raw token once; each row revokes through
 * DELETE /api/cli/tokens?id= after a confirm.
 */
export function TokenSection({ initialTokens }: { initialTokens: TokenListRow[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>CLI tokens</h2>
        </CardTitle>
        <CardDescription>
          Each laptop signs in with its own token. Revoke one to sign it out.
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
          title="No tokens yet"
          description="Create a token, then sign the CLI in with it."
        />
      )}
    </Card>
  );
}

/** The token card while the list loads: its header and two rows. */
export function TokenSectionLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>CLI tokens</h2>
        </CardTitle>
        <CardDescription>
          Each laptop signs in with its own token. Revoke one to sign it out.
        </CardDescription>
      </CardHeader>
      <output className="sr-only">Loading your tokens</output>
      <ItemGroup aria-hidden>
        {[0, 1].map((row) => (
          <Item key={row}>
            <ItemContent>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </ItemContent>
            <Skeleton className="h-4 w-14" />
          </Item>
        ))}
      </ItemGroup>
    </Card>
  );
}

function CreateTokenDialog({ onCreate }: { onCreate: (row: TokenListRow) => void }) {
  const id = useId();
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  // The raw token, held only while the dialog is open.
  const [token, setToken] = useState<string | null>(null);

  async function create() {
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
      label: created.label ?? "Untitled token",
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
      <DialogTrigger render={<Button size="sm" />}>Create token</DialogTrigger>
      <DialogContent>
        {token ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your token</DialogTitle>
              <DialogDescription>
                It won&apos;t be shown again. Only a hash of it is stored, so if you lose it, revoke
                it and create a new one.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <CodeBlock variant="command" command={token} prompt="" copyLabel="Copy token" />
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
              <DialogDescription>The CLI uses it to upload your sessions.</DialogDescription>
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
                  Name the laptop it is for, so you know which one to revoke.
                </FieldDescription>
              </Field>
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button variant="secondary" />} disabled={pending}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner />}
                Create token
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RevokeTokenDialog({
  id,
  label,
  onRevoke,
}: {
  id: string;
  label: string;
  onRevoke: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function revoke() {
    setPending(true);
    const response = await fetch(`/api/cli/tokens?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => null);
    setPending(false);
    // 404: already gone (revoked in another tab), so the row goes either way.
    if (response?.ok || response?.status === 404) {
      onRevoke();
      toast.add({ title: "Token revoked", description: `${label} is signed out.` });
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
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" disabled={pending} />}>
        {pending && <Spinner />}
        Revoke<span className="sr-only"> {label}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            The CLI signed in with this token can&apos;t upload sessions until you sign it in with a
            new one.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep token</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => void revoke()}>
            Revoke token
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
