/**
 * The header row over one frame on /setup and /settings: a small h2, an optional muted count or badge beside it, one
 * muted line under it, and one quiet action on the right.
 *
 * @param title - The section's name, rendered as its h2.
 * @param meta - A count ("Step 2 of 3") or a badge, beside the title.
 * @param description - What the section is for, in a line.
 * @param action - One quiet control: a ghost button or a dialog trigger.
 */
export function SectionHeader({
  title,
  meta,
  description,
  action,
}: {
  title: string;
  meta?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    // Stacked on phones, so the action doesn't squeeze the description into a thin column.
    <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-4">
      {/* skullet-own: static text stays real in the skeletons; only the meta and action are drawn as bars. */}
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 skullet-own="" className="type-heading-xs text-text-1">
            {title}
          </h2>
          {meta}
        </div>
        {description && (
          <p skullet-own="" className="type-body-sm text-pretty text-text-2">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
