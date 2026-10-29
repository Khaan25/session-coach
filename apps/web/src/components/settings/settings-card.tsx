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
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>{children}</CardAction>
      </CardHeader>
    </Card>
  );
}
