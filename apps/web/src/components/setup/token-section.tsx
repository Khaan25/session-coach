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

/** A token row with its times already written as words by the server. */
export type TokenListRow = { id: string; label: string; created: string; lastUsed: string | null };

/**
 * CLI tokens: "Create token" shows the new token once, and each row revokes after a confirm. Both are mocks on
 * local state. TODO(zia): POST and DELETE /api/cli/tokens (Kasam), once the response shape is agreed.
 */
export function TokenSection({
  initialTokens,
  sampleToken,
}: {
  initialTokens: TokenListRow[];
  /** SAMPLE: an obviously fake token, shown in place of the one the API returns. */
  sampleToken: string;
}) {
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
            sampleToken={sampleToken}
            onCreate={(label) => {
              setTokens((rows) => [
                { id: crypto.randomUUID(), label, created: "now", lastUsed: null },
                ...rows,
              ]);
              toast.add({ type: "success", title: "Token created", description: label });
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
                  label={token.label}
                  onRevoke={() => {
                    setTokens((rows) => rows.filter(({ id }) => id !== token.id));
                    toast.add({
                      title: "Token revoked",
                      description: `${token.label} is signed out.`,
                    });
                  }}
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

function CreateTokenDialog({
  sampleToken,
  onCreate,
}: {
  sampleToken: string;
  onCreate: (label: string) => void;
}) {
  const id = useId();
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState(false);

  return (
    <Dialog
      onOpenChange={(open) => {
        // The token is gone once the dialog closes; the next open starts a new one.
        if (!open) {
          setCreated(false);
          setLabel("");
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>Create token</DialogTrigger>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your token</DialogTitle>
              <DialogDescription>
                It won&apos;t be shown again. Only a hash of it is stored, so if you lose it, revoke
                it and create a new one.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <CodeBlock variant="command" command={sampleToken} prompt="" copyLabel="Copy token" />
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
              // TODO(zia): mock. POST /api/cli/tokens returns the raw token once; show that instead of the sample.
              onCreate(label.trim() || "Untitled token");
              setCreated(true);
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
                  onChange={(event) => setLabel(event.target.value)}
                />
                <FieldDescription>
                  Name the laptop it is for, so you know which one to revoke.
                </FieldDescription>
              </Field>
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
              <Button type="submit">Create token</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RevokeTokenDialog({ label, onRevoke }: { label: string; onRevoke: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
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
          {/* TODO(zia): mock. DELETE /api/cli/tokens?id= (404 for another learner's token). */}
          <AlertDialogAction variant="destructive" onClick={onRevoke}>
            Revoke token
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
