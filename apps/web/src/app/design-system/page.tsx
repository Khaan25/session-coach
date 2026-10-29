import type { Metadata } from "next";

import { ActionsCatalog } from "@/components/design-system/catalog-actions";
import { DataCatalog } from "@/components/design-system/catalog-data";
import { DisplayCatalog } from "@/components/design-system/catalog-display";
import { InputsCatalog } from "@/components/design-system/catalog-inputs";
import { NavigationCatalog } from "@/components/design-system/catalog-navigation";
import { OverlaysCatalog } from "@/components/design-system/catalog-overlays";
import { BlocksGallery } from "@/components/design-system/blocks-gallery";
import { cards, session } from "@/components/design-system/sample";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
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
import { Toaster } from "@/components/ui/toast";
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
];

// Every file in components/ui, in every variant, size and state, on example data from the shared sample session.
// Sections are plain #anchors, so the page needs no search params and stays static.
export default function DesignSystemPage() {
  return (
    <TooltipProvider>
      <Toaster>
        <div className="mx-auto flex w-full max-w-(--container) flex-col gap-12 px-(--gutter-sm) py-6 sm:px-(--gutter)">
          <PageHeader kind="agent" condense>
            <PageHeaderRow>
              <PageHeaderContent>
                <PageHeaderTitle>Design system</PageHeaderTitle>
                <PageHeaderDescription>
                  Explain back the decisions your coding agent made. Every component in
                  components/ui, on the sample session.
                </PageHeaderDescription>
              </PageHeaderContent>
              <PageHeaderActions>
                <ThemeToggle />
              </PageHeaderActions>
            </PageHeaderRow>
            <PageHeaderStats>
              <PageHeaderStat label="Session" value={session.duration_min} detail="min" />
              <PageHeaderStat label="Events" value={session.event_count} />
              <PageHeaderStat label="Cards" value={cards.length} detail="3 to 5 per session" />
            </PageHeaderStats>
          </PageHeader>

          <nav aria-label="Sections" className="flex flex-wrap gap-2">
            {SECTIONS.map((section) => (
              <Button
                key={section.id}
                variant="ghost"
                size="sm"
                render={<a href={`#${section.id}`} />}
                nativeButton={false}
              >
                {section.label}
              </Button>
            ))}
          </nav>

          <ActionsCatalog />
          <InputsCatalog />
          <DisplayCatalog />
          <DataCatalog />
          <OverlaysCatalog />
          <NavigationCatalog />
          <BlocksGallery />
        </div>
      </Toaster>
    </TooltipProvider>
  );
}
