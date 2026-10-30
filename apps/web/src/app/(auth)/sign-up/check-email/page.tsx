import { EnvelopeSimpleIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";

export const metadata: Metadata = {
  title: "Check your email | Session Coach",
  robots: { index: false },
};

// Every sign-up lands here, new address or not, so the page never says whether an account exists (docs/plans/auth.md #3).
export default function CheckEmailPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-(--gutter-sm) pt-16 pb-20 sm:px-(--gutter) sm:pt-24 sm:pb-30">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-none tracking-tight text-text-1 sm:text-6xl">
          Check your <span className="italic">email</span>
        </h1>
        <p className="type-body text-pretty text-text-2">
          If that address can sign up, we sent it a link to confirm the account. Open the link on
          this device to finish.
        </p>
      </div>
      {/* TODO(zia): a "Resend the email" button (resendConfirmation, auth.resend type "signup") with a 60 s cooldown
      and generic copy (docs/plans/auth.md #2). It needs the address, so pass it through without putting it in the URL. */}
      <Item variant="outline">
        <ItemMedia variant="icon">
          <EnvelopeSimpleIcon weight="duotone" aria-hidden />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Sign-up isn&apos;t open yet</ItemTitle>
          <ItemDescription>
            Accounts arrive with the next release, so no email was sent. Nothing you typed was
            saved.
          </ItemDescription>
        </ItemContent>
      </Item>
      <p className="type-body-sm text-text-2">
        Already confirmed?{" "}
        <Link href="/login" className={buttonVariants({ variant: "link" })}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
