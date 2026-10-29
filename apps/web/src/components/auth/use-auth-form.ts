import { useActionState, useState } from "react";

import type { AuthState } from "@/app/(auth)/actions";
import type { AuthFieldErrors } from "@/lib/auth/validate";

/**
 * An auth form's submit: check the fields in the browser, and only send a clean form to the Server Action. A failed
 * check blocks the submit and moves focus to the first invalid field; the server's answer shows only after a clean
 * submit, so a stale notice never sits next to fresh field errors.
 *
 * @param action - The Server Action the form posts to.
 * @param validate - The browser-side check (lib/auth/validate.ts), keyed by input `name`.
 */
export function useAuthForm(
  action: (prev: AuthState, data: FormData) => Promise<AuthState>,
  validate: (data: FormData) => AuthFieldErrors,
) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
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
    /** The server's answer, or undefined while browser-side errors show. */
    result: clientErrors ? undefined : state,
    /** The address last sent, to keep it in the field after React resets the form. */
    email: state.email,
  };
}
