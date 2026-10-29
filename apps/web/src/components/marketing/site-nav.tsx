import { Cards } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Button } from "@/components/ui/button";

// TODO(zia): /how-it-works, /pricing, /support and /login are planned pages; they 404 until they land.
const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

export function SiteNav() {
  return (
    <header className="animate-in duration-500 ease-out-quint fade-in motion-reduce:animate-none">
      <nav
        aria-label="Main"
        className="mx-auto flex h-18 w-full max-w-(--container) items-center justify-between gap-6 px-(--gutter-sm) sm:h-20 sm:px-(--gutter)"
      >
        <Link href="/" className="flex items-center gap-2 type-label text-text-1">
          <Cards weight="duotone" className="size-6" aria-hidden />
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
        <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
          Sign in
        </Button>
      </nav>
    </header>
  );
}
