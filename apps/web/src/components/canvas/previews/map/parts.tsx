// Small pieces the app map's states share. Synthetic data only, like every canvas preview.

import { Container } from "@/components/app/container";
import { AppPageHeader } from "@/components/app/page-header";

import { AppFrame } from "../frames";

/** The toast the real app raises (ui/toast), drawn still at the bottom of the window for an overlay. */
export function CanvasToast({ title, description }: { title: string; description?: string }) {
  return (
    <output
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
    >
      <span className="flex flex-col gap-0.5 rounded-soft border border-hair bg-page px-3 py-2">
        <span className="type-label text-text-1">{title}</span>
        {description && <span className="type-body-sm text-text-2">{description}</span>}
      </span>
    </output>
  );
}

/** An (app) page: the shell, the container and the page's header, then the state. */
export function MapAppPage({
  path,
  title,
  description,
  crumb,
  dueCount,
  children,
}: {
  path: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  crumb?: string;
  dueCount?: number;
  children: React.ReactNode;
}) {
  return (
    <AppFrame path={path} crumb={crumb} dueCount={dueCount}>
      <Container>
        <AppPageHeader title={title} description={description} />
        {children}
      </Container>
    </AppFrame>
  );
}
