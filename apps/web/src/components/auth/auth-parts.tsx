// The pieces every auth screen is built from. Layout only: no state, so no context.
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** The Session Coach mark and name, linking home. */
export function BrandLink() {
  return (
    <Link href="/" className="flex items-center gap-2 type-label text-text-1">
      <BrandMark className="size-6" />
      Session Coach
    </Link>
  );
}

/**
 * An auth screen's h1 and optional lead line.
 *
 * @param title - The heading; every screen italicises one word, so it takes JSX.
 * @param children - The lead line under the heading.
 */
export function AuthHeading({
  title,
  children,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-5xl leading-none tracking-tight text-text-1 sm:text-6xl">
        {title}
      </h1>
      {children && <p className="type-body text-pretty text-text-2">{children}</p>}
    </div>
  );
}

/** The large card an auth form sits in. */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <Card size="lg">
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** The form's live region: always mounted, so a notice is read out when it appears. Put AuthNotice inside. */
export function AuthStatus({ children }: { children: React.ReactNode }) {
  // A div, not <output>: the notice is block content.
  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
  return <div role="status">{children}</div>;
}

/**
 * The line under a form that sends the learner to the other screen: "New to Session Coach? Create an account".
 *
 * @param prompt - The question before the link.
 * @param href - Where the link goes.
 * @param children - The link text.
 */
export function AuthSwitch({
  prompt,
  href,
  children,
}: {
  prompt: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <p className="type-body-sm text-text-2">
      {prompt}{" "}
      <Link href={href} className={buttonVariants({ variant: "link" })}>
        {children}
      </Link>
    </p>
  );
}
