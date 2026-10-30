import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/support", label: "Support" },
] as const;

/**
 * A full-bleed watercolour desk by a window that sits on top of the footer. Landing page only: the layout's footer is
 * shared, so the page renders this as its last block. Phones keep a 48rem-wide crop of the middle; the bottom fades
 * into the footer rule.
 */
export function FooterScene() {
  return (
    // The painting's blank sky tucks under the closing section's bottom padding.
    <div aria-hidden className="pointer-events-none -mt-12 overflow-hidden select-none sm:-mt-24">
      <Image
        src="/art/footer-desk.webp"
        alt=""
        width={1600}
        height={533}
        sizes="(min-width: 48rem) 100vw, 48rem"
        className="relative left-1/2 w-full max-w-none min-w-3xl -translate-x-1/2 mask-b-from-70% dark:hidden"
      />
      <Image
        src="/art/footer-desk-dark.webp"
        alt=""
        width={1600}
        height={533}
        sizes="(min-width: 48rem) 100vw, 48rem"
        className="relative left-1/2 hidden w-full max-w-none min-w-3xl -translate-x-1/2 mask-b-from-70% dark:block"
      />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="rule-top">
      <div className="mx-auto flex w-full max-w-(--container) flex-col gap-4 px-(--gutter-sm) py-8 sm:flex-row sm:items-center sm:justify-between sm:px-(--gutter)">
        <p className="type-body-sm text-text-2">
          Explain back the decisions your coding agent made.
        </p>
        <ul className="flex gap-6">
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
      </div>
    </footer>
  );
}
