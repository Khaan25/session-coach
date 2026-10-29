import Link from "next/link";

import { RouteAuthArt } from "@/components/auth/auth-art";
import { BrandLink } from "@/components/auth/auth-parts";

const links = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/support", label: "Support" },
] as const;

// Signed-out screens, after shadcn's login-02: the form column on the left with the brand at its top, the art on the
// right from lg up. Only the brand, never the marketing nav or the account menu.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-full flex-1 bg-page lg:grid-cols-2">
      <div className="flex flex-col">
        <header className="flex h-18 items-center px-(--gutter-sm) sm:h-20 sm:px-(--gutter)">
          <BrandLink />
        </header>
        <main className="flex flex-1 flex-col justify-center">
          {/* The one form column every auth screen sits in. */}
          <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-(--gutter-sm) pt-16 pb-20 sm:px-(--gutter) sm:pt-24 sm:pb-30">
            {children}
          </div>
        </main>
        <footer className="px-(--gutter-sm) py-8 sm:px-(--gutter)">
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
      <RouteAuthArt />
    </div>
  );
}
