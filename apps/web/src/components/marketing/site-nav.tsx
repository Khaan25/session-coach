import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { sampleUser } from "@/lib/sample/account";

import { SiteNavAccount } from "./site-nav-account";
import { SiteNavMenu } from "./site-nav-menu";

const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" },
] as const;

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
          {/* SAMPLE: shown signed in. TODO(zia): the Supabase session's user, or null when signed out (Phase 2). */}
          <SiteNavAccount user={sampleUser} />
        </div>
      </nav>
    </header>
  );
}
