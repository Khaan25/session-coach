import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * One numbered step of /settings: on the left its title, a Set or Check this badge and what it changes in the review
 * loop; on the right the control. Renders an `li`, so it goes in an `ol`.
 *
 * @param n - The step's number, shown in the circle.
 * @param title - The step's name, rendered as its h2.
 * @param changes - What this setting changes, in a sentence.
 * @param done - Set (true) or Check this (false); undefined shows no badge, for a step the page can't judge.
 * @param children - The control: fields, a list or a link.
 */
export function ChecklistStep({
  n,
  title,
  changes,
  done,
  children,
}: {
  n: number;
  title: string;
  changes: React.ReactNode;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="grid gap-4 md:grid-cols-12 md:gap-6">
      <div className="flex gap-3 md:col-span-4">
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-well type-label text-text-1 tabular-nums"
        >
          {n}
        </span>
        {/* skullet-own: static text stays real in the settings skeleton; only the badge and control are drawn. */}
        <div className="flex flex-col gap-1">
          <h2 className="flex flex-wrap items-center gap-2 type-heading-xs text-text-1">
            <span skullet-own="">{title}</span>
            {done !== undefined && (
              <Badge variant={done ? "success" : "outline"}>{done ? "Set" : "Check this"}</Badge>
            )}
          </h2>
          <p skullet-own="" className="type-body-sm text-text-2">
            {changes}
          </p>
        </div>
      </div>
      <div className="md:col-span-8">
        <Card>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </li>
  );
}
