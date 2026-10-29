import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

const links = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/support", label: "Support" },
] as const;

// Signed-out screens: only the brand, never the marketing nav or the account menu.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-page">
      <header className="mx-auto flex h-18 w-full max-w-(--container) items-center px-(--gutter-sm) sm:h-20 sm:px-(--gutter)">
        <Link href="/" className="flex items-center gap-2 type-label text-text-1">
          <BrandMark className="size-6" />
          Session Coach
        </Link>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="mx-auto w-full max-w-(--container) px-(--gutter-sm) py-8 sm:px-(--gutter)">
        <ul className="flex justify-center gap-6">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="type-body-sm text-text-2 transition-colors duration-(--dur-fast) hover:text-text-1"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
