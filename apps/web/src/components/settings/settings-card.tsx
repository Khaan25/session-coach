import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * One settings row: an h2 title, a line on what it does, and the control that does it.
 *
 * @param title - The setting's name, rendered as the card's h2.
 * @param description - What the action does, in one line.
 * @param children - The action: a button, link or dialog trigger.
 */
export function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        {/* skullet-own: static text stays real in the settings skeleton; only the control is drawn as a bar. */}
        <CardTitle skullet-own="">
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription skullet-own="">{description}</CardDescription>
        <CardAction>{children}</CardAction>
      </CardHeader>
    </Card>
  );
}
