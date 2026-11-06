"use client";
import { usePathname } from "next/navigation";
import { PaletteIcon, ArrowUpRightIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
const screens = [
  ["Website", "/"],
  ["Today", "/dashboard"],
  ["Sessions", "/sessions"],
  ["Review complete", "/review/complete"],
  ["Session · answered and locked", "/s/22222222-2222-4222-8222-222222222222"],
  ["Review queue", "/review"],
  ["Defend it · timed follow-up", "/defend"],
  ["Explain a card", "/review/55555555-5555-4555-8555-000000000001"],
  ["First attempt", "/review/55555555-5555-4555-8555-000000000002"],
  ["Progress", "/progress"],
  ["Rapporteur · project progress", "/progress?project=repo%3Arapporteur"],
  ["Session Coach · project progress", "/progress?project=repo%3Asession-coach"],
  ["Setup", "/setup"],
  ["Settings · project levels", "/settings"],
  ["Project onboarding", "/dashboard?preview=project-setup"],
  ["Approve a device", "/cli/approve?code=WDJB-MJHT"],
  ["Expired device code", "/cli/approve?code=BDFG-HJKL"],
  ["No connected devices", "/setup?preview=empty-devices"],
  ["Ideas canvas", "/canvas"],
  ["Session received", "/s/99999999-9999-4999-8999-999999999991"],
  ["Processing", "/s/44444444-4444-4444-8444-444444444444"],
  ["Session without decisions", "/s/99999999-9999-4999-8999-999999999992"],
  ["Failed session", "/s/88888888-8888-4888-8888-888888888888"],
  ["Empty dashboard", "/dashboard?preview=empty"],
  ["Sign in", "/login"],
  ["Sign up", "/sign-up"],
];
export function PreviewNav({ port, shared = false }: { port: number; shared?: boolean }) {
  const entry = shared ? "/__design/preview" : `http://localhost:${port}/preview`;
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <aside className="design-preview-dock" aria-label="Local design preview">
      <button
        className="preview-dock-toggle"
        aria-expanded={open}
        type="button"
        onClick={() => setOpen(!open)}
      >
        <PaletteIcon aria-hidden />
        <span>Design preview</span>
        <small>Sample data</small>
        {open ? <XIcon aria-hidden /> : <ArrowUpRightIcon aria-hidden />}
      </button>
      {open && (
        <nav className="preview-dock-menu" aria-label="Preview screens">
          <p>Explore every screen</p>
          {screens.map(([name, href]) => (
            <a
              key={name}
              aria-current={path === href ? "page" : undefined}
              href={`${entry}?screen=${encodeURIComponent(href)}`}
            >
              {name}
              <ArrowUpRightIcon aria-hidden />
            </a>
          ))}
          <a href={`${entry}?screen=/dashboard&reset=1`}>
            Reset sample workspace
            <ArrowUpRightIcon aria-hidden />
          </a>
          <span>Local fixtures. No real account or database.</span>
        </nav>
      )}
    </aside>
  );
}
