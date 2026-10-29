import Link from "next/link";

// TODO(zia): /privacy, /terms and /support are planned pages; they 404 until they land.
const links = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/support", label: "Support" },
] as const;

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
