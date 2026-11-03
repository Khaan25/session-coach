import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AppCatalog } from "@/components/design-system/catalog-app";
import { ActionsCatalog } from "@/components/design-system/catalog-actions";
import { DataCatalog } from "@/components/design-system/catalog-data";
import { DisplayCatalog } from "@/components/design-system/catalog-display";
import { InputsCatalog } from "@/components/design-system/catalog-inputs";
import { NavigationCatalog } from "@/components/design-system/catalog-navigation";
import { OverlaysCatalog } from "@/components/design-system/catalog-overlays";
import { BlocksGallery } from "@/components/design-system/blocks-gallery";
import { cards, session } from "@/components/design-system/sample";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderRow,
  PageHeaderStat,
  PageHeaderStats,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false },
};

const SECTIONS = [
  { id: "actions", label: "Actions" },
  { id: "inputs", label: "Inputs" },
  { id: "display", label: "Display" },
  { id: "data", label: "Data" },
  { id: "overlays", label: "Overlays and motion" },
  { id: "navigation", label: "Navigation" },
  { id: "blocks", label: "Blocks" },
  { id: "app", label: "App blocks" },
];

/**
 * /design-system: every file in components/ui, in every variant, size and state, on example data from the shared
 * sample session. Sections are plain #anchors. Not served on the production deployment; local dev and preview
 * deploys only.
 */
export default function DesignSystemPage() {
  return (
    <Suspense>
      <ProductionGate />
    </Suspense>
  );
}

/** Checked per request, so a preview build promoted to production can't keep a baked-in answer. */
async function ProductionGate() {
  await connection();
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <TooltipProvider>
      <main className="mx-auto flex w-full max-w-(--container) flex-col gap-12 px-(--gutter-sm) py-6 sm:px-(--gutter)">
        <PageHeader kind="agent" condense>
          <PageHeaderRow>
            <PageHeaderContent>
              <PageHeaderTitle>Design system</PageHeaderTitle>
              <PageHeaderDescription>
                Explain back the decisions your coding agent made. Every component in components/ui,
                on the sample session.
              </PageHeaderDescription>
            </PageHeaderContent>
            <PageHeaderActions>
              <ThemeToggle />
            </PageHeaderActions>
          </PageHeaderRow>
          <PageHeaderStats>
            <PageHeaderStat label="Session" value={session.duration_min} detail="min" />
            <PageHeaderStat label="Events" value={session.event_count} />
            <PageHeaderStat label="Cards" value={cards.length} detail="up to 5 per session" />
          </PageHeaderStats>
        </PageHeader>

        <nav aria-label="Sections" className="flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {section.label}
            </a>
          ))}
        </nav>

        <ActionsCatalog />
        <InputsCatalog />
        <DisplayCatalog />
        <DataCatalog />
        <OverlaysCatalog />
        <NavigationCatalog />
        <BlocksGallery />
        <AppCatalog />
      </main>
    </TooltipProvider>
  );
}
