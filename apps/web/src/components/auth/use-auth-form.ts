import { createContext, use, useActionState, useState } from "react";

import type { AuthState } from "@/app/(auth)/actions";
import { useDryRun } from "@/components/app/dry-run";
import type { AuthFieldErrors } from "@/lib/auth/validate";

/**
 * The server's answer to show without a submit, for /canvas: a field error or a notice, drawn by the real form. Null
 * everywhere else.
 */
export const AuthPreviewContext = createContext<AuthState | null>(null);

/**
 * An auth form's submit: check the fields in the browser, and only send a clean form to the Server Action. A failed
 * check blocks the submit and moves focus to the first invalid field; the server's answer shows only after a clean
 * submit, so a stale notice never sits next to fresh field errors. Under DryRunContext (/canvas) the action is never
 * called: the form answers with the AuthPreviewContext state, or nothing.
 *
 * @param action - The Server Action the form posts to.
 * @param validate - The browser-side check (lib/auth/validate.ts), keyed by input `name`.
 */
export function useAuthForm(
  action: (prev: AuthState, data: FormData) => Promise<AuthState>,
  validate: (data: FormData) => AuthFieldErrors,
) {
  const preview = use(AuthPreviewContext);
  const dryRun = useDryRun() || preview !== null;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    dryRun ? async () => preview ?? {} : action,
    preview ?? {},
  );
  // Set when the browser-side check fails; cleared when a submit goes through, so the server's answer shows.
  const [clientErrors, setClientErrors] = useState<AuthFieldErrors>();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const found = validate(new FormData(form));
    if (Object.keys(found).length === 0) return setClientErrors(undefined);
    event.preventDefault();
    setClientErrors(found);
    // The first invalid field in page order.
    const first = Array.from(form.elements).find(
      (element): element is HTMLInputElement =>
        element instanceof HTMLInputElement && element.name in found,
    );
    first?.focus();
  }

  return {
    action: formAction,
    handleSubmit,
    pending,
    /** The message under each field: the browser's check, else the server's. */
    errors: clientErrors ?? state.fields ?? {},
    /** The server's answer, or undefined while browser-side errors show or a new submit is on its way. */
    result: clientErrors || pending ? undefined : state,
    /** The address last sent, to keep it in the field after React resets the form. */
    email: state.email,
    /** The sign-up name last sent, kept the same way. */
    name: state.name,
  };
}
