// Small pieces the app map's states share. Synthetic data only, like every canvas preview.

import { AlertDialogFooter, AlertDialogHeader } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { IdeaNote } from "../parts";

/** The toast the real app raises (ui/toast), drawn still at the bottom of the window for an overlay. */
export function CanvasToast({ title, description }: { title: string; description?: string }) {
  return (
    <output
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
    >
      <span className="flex flex-col gap-0.5 rounded-soft border border-hair bg-page px-3 py-2">
        <span className="type-label text-text-1">{title}</span>
        {description && <span className="type-body-sm text-text-2">{description}</span>}
      </span>
    </output>
  );
}

/**
 * DeleteAccountDialog open, drawn in place with its copy and parts: the real AlertDialog is modal and portals to the
 * body, so held open it would trap the whole canvas.
 */
export function DeleteAccountOpen() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-overlay p-4">
      <section
        aria-labelledby="canvas-delete-title"
        className="flex w-full max-w-overlay-sm flex-col rounded-frame bg-(--surface-frame) text-text-1 shadow-overlay"
      >
        <AlertDialogHeader>
          <h2 id="canvas-delete-title" className="type-heading-xs break-words text-text-1">
            Delete your account?
          </h2>
          <p className="type-body break-words text-text-2">
            This deletes your sessions, cards, answers and tokens for good. It can&apos;t be undone.
          </p>
          <Field className="mt-3">
            <FieldLabel htmlFor="canvas-delete-email">Type sam@example.com to confirm</FieldLabel>
            <Input id="canvas-delete-email" type="email" autoComplete="off" defaultValue="sam@" />
          </Field>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="secondary">Keep account</Button>
          <Button variant="destructive" disabled>
            Delete account
          </Button>
        </AlertDialogFooter>
      </section>
    </div>
  );
}

/** A flow map: each step links to its item on the canvas. */
export function FlowPreview({
  title,
  steps,
  note,
}: {
  title: string;
  steps: { label: string; item: string }[];
  note: string;
}) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <span className="type-heading">{title}</span>
      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <li key={step.item} className="flex items-baseline gap-3">
            <span className="type-label text-text-3 tabular-nums">{i + 1}</span>
            <a
              href={`#item-${step.item}`}
              className="type-body text-text-1 underline underline-offset-4"
            >
              {step.label}
            </a>
          </li>
        ))}
      </ol>
      <IdeaNote>{note}</IdeaNote>
    </div>
  );
}
