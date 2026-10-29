import type { Icon } from "@phosphor-icons/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * A marketing card: an icon beside the title, the body under it. The large size draws a larger icon.
 *
 * @param icon - The Phosphor icon, drawn duotone.
 * @param title - The card's title; pass JSX to add screen-reader text such as "Step 1: ".
 * @param size - The card size; `lg` for the headline cards.
 * @param children - The body, under the header.
 */
export function FeatureCard({
  icon: IconComponent,
  title,
  size,
  children,
}: {
  icon: Icon;
  title: React.ReactNode;
  size?: "lg";
  children: React.ReactNode;
}) {
  return (
    <Card size={size} className="w-full">
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-3">
            <IconComponent
              weight="duotone"
              className={size === "lg" ? "size-6" : "size-5"}
              aria-hidden
            />
            {title}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
