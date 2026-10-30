"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import {
  AlertDialog,
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
 * Delete account: the confirm stays disabled until the learner types their email. DELETE /api/account removes their
 * Storage objects, then the auth user (cascading to all rows), then signs out. The dialog stays open until it answers.
 */
export function DeleteAccountDialog({ email }: { email: string }) {
  const id = useId();
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const matches = email !== "" && typed.trim().toLowerCase() === email.toLowerCase();

  async function deleteAccount() {
    setPending(true);
    const response = await fetch("/api/account", { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setPending(false);
      const body: { error?: string } | null = await response?.json().catch(() => null);
      toast.add({
        title: "Your account was not deleted",
        description: body?.error ?? "Check your connection and try again.",
      });
      return;
    }
    toast.add({ title: "Your account was deleted" });
    router.replace("/");
    router.refresh();
  }

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
          <AlertDialogCancel disabled={pending}>Keep account</AlertDialogCancel>
          <Button variant="destructive" disabled={!matches || pending} onClick={deleteAccount}>
            Delete account
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
