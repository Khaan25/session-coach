/**
 * One account action row: an h3 title, a line on what it does, and the control that does it, on the right at sm and up.
 *
 * @param title - The action's name, rendered as an h3.
 * @param description - What the action does, in one line.
 * @param children - The action: a button, link or dialog trigger.
 */
export function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      {/* skullet-own: static text stays real in the settings skeleton; only the control is drawn as a bar. */}
      <div className="flex flex-col gap-1">
        <h3 skullet-own="" className="type-label text-text-1">
          {title}
        </h3>
        <p skullet-own="" className="type-body-sm text-pretty text-text-2">
          {description}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
