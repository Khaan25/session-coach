import { EnvelopeSimpleIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Delete your account | Session Coach",
  description: "How to delete your Session Coach account and data, with or without signing in.",
};

// Same inbox as /support. Inlined at build time, so the page stays static; set NEXT_PUBLIC_SUPPORT_EMAIL before launch.
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com";

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-(--container) flex-col gap-16 px-(--gutter-sm) py-16 sm:px-(--gutter) sm:py-20">
      <MarketingPageHeader title="Delete your account">
        Deleting your account removes your profile, sessions, session logs, decision cards, answers
        and CLI tokens for good.
      </MarketingPageHeader>

      <section aria-labelledby="signed-in-title" className="flex max-w-xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 id="signed-in-title">If you can sign in</h2>
            </CardTitle>
            <CardDescription>
              Go to{" "}
              <Link href="/settings" className="text-text-1 underline underline-offset-4">
                Settings
              </Link>
              , choose Delete account and type your email to confirm. It happens at once.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 id="signed-out-title" className="flex items-center gap-3">
                <EnvelopeSimpleIcon weight="duotone" className="size-5" aria-hidden />
                If you can&apos;t sign in
              </h2>
            </CardTitle>
            <CardDescription>
              Email{" "}
              <a
                href={`mailto:${supportEmail}?subject=Delete%20my%20account`}
                className="text-text-1 underline underline-offset-4"
              >
                {supportEmail}
              </a>{" "}
              from the address you signed up with and ask us to delete your account. TODO(zia): how
              we confirm it&apos;s you, and how soon.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}
