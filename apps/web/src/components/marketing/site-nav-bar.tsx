import Link from "next/link";

import { BrandLink } from "@/components/auth/auth-parts";

import { SiteNavMenu } from "./site-nav-menu";

const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" },
] as const;

/**
 * The public header: the brand, the three links (a menu on phones) and the account corner. SiteNav passes the
 * signed-in learner's corner; /canvas passes the signed-out one.
 */
export function SiteNavBar({ account }: { account: React.ReactNode }) {
  return (
    <header className="site-header">
      <nav
        aria-label="Main"
        className="mx-auto flex h-18 w-full max-w-(--container) items-center justify-between gap-6 px-(--gutter-sm) sm:h-20 sm:px-(--gutter)"
      >
        <BrandLink />
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
          {account}
        </div>
      </nav>
    </header>
  );
}
