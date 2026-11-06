import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * One section of /settings and /members: one card whose header holds a small muted icon, the title as an h2 and one line
 * on what it changes, over a hairline, then the controls, then an optional footer for the section's own save.
 *
 * @param id - The anchor the settings nav links to.
 * @param icon - A 16px Phosphor icon, decorative.
 * @param title - The section's name; the danger card passes a span in the fail colour.
 * @param description - What this section changes, in a line.
 * @param done - Set (true) or Check this (false); undefined shows no badge, for a section the page can't judge.
 * @param meta - Something else at the header's end in place of the badge, such as a count.
 * @param footer - The section's actions, at the end under a hairline: its Save button.
 * @param children - The controls.
 */
export function SettingsSection({
  id,
  icon,
  title,
  description,
  done,
  meta,
  footer,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  done?: boolean;
  meta?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const action =
    meta ??
    (done !== undefined && (
      <Badge variant={done ? "success" : "outline"}>{done ? "Set" : "Check this"}</Badge>
    ));
  return (
    // scroll-mt: a jump from the settings nav lands below the sticky topbar, not under it.
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-(--topbar)">
      <Card>
        <CardHeader>
          {/* skullet-own: static text stays real in the skeleton; only the controls are drawn as bars. */}
          <CardTitle>
            <h2 id={`${id}-title`} skullet-own="" className="flex items-center gap-2">
              <span aria-hidden className="flex text-text-3">
                {icon}
              </span>
              {title}
            </h2>
          </CardTitle>
          {description && <CardDescription skullet-own="">{description}</CardDescription>}
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer && <CardFooter className="justify-end">{footer}</CardFooter>}
      </Card>
    </section>
  );
}
