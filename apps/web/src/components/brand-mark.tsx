import { CardsIcon } from "@phosphor-icons/react/ssr";
import { cn } from "cn";

/** The Session Coach mark: the decision-card stack, everywhere the name appears. Size it where it sits. */
export function BrandMark({ className }: { className?: string }) {
  return <CardsIcon weight="duotone" aria-hidden className={cn("shrink-0", className)} />;
}
