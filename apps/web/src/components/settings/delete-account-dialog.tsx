"use client";

import { useId, useState } from "react";

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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

/**
 * Delete account: the confirm stays disabled until the learner types their email. A mock.
 * TODO(zia): DELETE /api/account removes every Storage object under the learner's sessions, then the auth user
 * (cascading to all rows), then signs out.
 */
export function DeleteAccountDialog({ email }: { email: string }) {
  const id = useId();
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === email.toLowerCase();
  return (
    <AlertDialog onOpenChange={(open) => !open && setTyped("")}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Delete account
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes your sessions, cards, answers and tokens for good. It can&apos;t be undone.
          </AlertDialogDescription>
          <Field className="mt-3">
            <FieldLabel htmlFor={`${id}-email`}>Type {email} to confirm</FieldLabel>
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          </Field>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep account</AlertDialogCancel>
          {/* TODO(zia): mock. Call DELETE /api/account. */}
          <AlertDialogAction
            variant="destructive"
            disabled={!matches}
            onClick={() =>
              toast.add({
                title: "Your account was not deleted",
                description: "Account deletion isn't built yet. TODO(zia): Phase 8.",
              })
            }
          >
            Delete account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
