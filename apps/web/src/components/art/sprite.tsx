import {
  CardsIcon,
  EnvelopeSimpleIcon,
  LeafIcon,
  PencilLineIcon,
  CoffeeIcon,
} from "@phosphor-icons/react/ssr";
import { cn } from "cn";

const SPRITES = {
  pencil: PencilLineIcon,
  letter: EnvelopeSimpleIcon,
  plant: LeafIcon,
  tea: CoffeeIcon,
  cards: CardsIcon,
} as const;
export type SpriteName = keyof typeof SPRITES;

/** A consistent, decorative glyph for empty states and the review prompt. */
export function Sprite({ name, className }: { name: SpriteName; className?: string }) {
  const Icon = SPRITES[name];
  return (
    <span aria-hidden className={cn("sprite-glyph pointer-events-none select-none", className)}>
      <Icon weight="duotone" />
    </span>
  );
}
