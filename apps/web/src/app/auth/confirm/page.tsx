import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthCard, AuthSwitch } from "@/components/auth/auth-parts";
import { AuthErrorNotice, ConfirmHeading } from "@/components/auth/auth-screens";
import { ConfirmButton } from "@/components/auth/confirm-button";
import { isOtpType } from "@/lib/auth/otp";

import { confirmEmail, confirmEmailCode } from "./actions";

export const metadata: Metadata = {
  title: "Confirm | Session Coach",
  robots: { index: false },
};

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

// The link's query is request data, so with cacheComponents it is read inside <Suspense>.
async function ConfirmForm({ searchParams }: Pick<PageProps<"/auth/confirm">, "searchParams">) {
  const params = await searchParams;
  // Supabase's default template verifies on its side and comes back with an error or a PKCE code, not a token_hash.
  const errorCode = first(params.error_code) ?? first(params.error);
  if (errorCode)
    redirect(`/auth/error?code=${errorCode === "otp_expired" ? "link_expired" : "confirm_failed"}`);
  const code = first(params.code);
  if (code)
    return (
      <AuthCard>
        <form action={confirmEmailCode} className="flex flex-col">
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="next" value={first(params.next) ?? ""} />
          <ConfirmButton>
            {first(params.next) === "/update-password"
              ? "Continue to set a password"
              : "Confirm and sign in"}
          </ConfirmButton>
        </form>
      </AuthCard>
    );

  const tokenHash = first(params.token_hash);
  const type = first(params.type);
  if (!tokenHash || !isOtpType(type)) return <AuthErrorNotice code="invalid_link" />;

  const recovery = type === "recovery";
  return (
    <AuthCard>
      <form action={confirmEmail} className="flex flex-col">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={first(params.next) ?? ""} />
        <ConfirmButton>
          {recovery ? "Continue to set a password" : "Confirm and sign in"}
        </ConfirmButton>
      </form>
    </AuthCard>
  );
}

// A page with a button, not a GET handler: email link scanners open links before people do and would spend the
// one-time token (docs/plans/auth.md #8).
export default function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  return (
    <>
      <ConfirmHeading />
      <Suspense>
        <ConfirmForm searchParams={searchParams} />
      </Suspense>
      <AuthSwitch prompt="Didn't ask for this?" href="/">
        Go home
      </AuthSwitch>
    </>
  );
}
