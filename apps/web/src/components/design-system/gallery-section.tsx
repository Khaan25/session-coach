// One section of the gallery (an anchor target in the page's section nav) and one labelled specimen row inside it.
// Server-safe: plain markup, so the client catalogs can sit inside it.

function GallerySection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-6 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="type-heading text-text-1">
          {title}
        </h2>
        {description && <p className="type-body-sm text-text-2">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Specimen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h3 className="type-label text-text-2">{label}</h3>
      <div className="flex min-w-0 flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export { GallerySection, Specimen };
