import Link from "next/link";
import { Suspense } from "react";

import { BrandMark } from "@/components/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";
import { initialsOf } from "@/lib/auth/initials";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProfile } from "@/lib/auth/profile";

import { type SiteNavUser, SiteNavAccount } from "./site-nav-account";
import { SiteNavMenu } from "./site-nav-menu";

const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" },
] as const;

/**
 * The signed-in learner for the header, or null. It reads cookies, so it renders inside <Suspense> and only per
 * request: never prerendered or cached, so one learner's name can't reach another visitor (docs/plans/auth.md #20).
 */
async function SiteNavSession() {
  const claims = await getCurrentUser();
  let user: SiteNavUser | null = null;
  if (claims) {
    // A failed profile read still shows the account, by its email, rather than "Sign in".
    const profile = await getProfile().catch((error: unknown) => {
      console.error("SiteNav: getProfile", error);
      return null;
    });
    const email = profile?.email ?? claims.email ?? "";
    const name = profile?.display_name ?? (email.split("@")[0] || "Your account");
    user = { name, email, initials: initialsOf(profile?.display_name, email) };
  }
  return <SiteNavAccount user={user} />;
}

export function SiteNav() {
  return (
    <header className="animate-in duration-500 ease-out-quint fade-in motion-reduce:animate-none">
      <nav
        aria-label="Main"
        className="mx-auto flex h-18 w-full max-w-(--container) items-center justify-between gap-6 px-(--gutter-sm) sm:h-20 sm:px-(--gutter)"
      >
        <Link href="/" className="flex items-center gap-2 type-label text-text-1">
          <BrandMark className="size-6" />
          Session Coach
        </Link>
        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="type-label text-text-2 transition-colors duration-(--dur-fast) hover:text-text-1"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <SiteNavMenu links={links} />
          <Suspense fallback={<Skeleton className="h-(--control) w-24" />}>
            <SiteNavSession />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}
