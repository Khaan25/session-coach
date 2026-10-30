import { cn } from "cn";
import Image from "next/image";

// Real pixel sizes of the WebP files in public/art/sprites (the day and night copies share one size).
const SPRITES = {
  pencil: [192, 167],
  letter: [192, 137],
  plant: [135, 192],
  tea: [192, 187],
  cards: [192, 160],
} as const;

export type SpriteName = keyof typeof SPRITES;

/**
 * A small watercolour desk object. Decorative only: hidden from assistive tech and the pointer. Size it with a
 * width class; the height follows. Two copies switch by theme, the dark one keeps its paper.
 */
export function Sprite({ name, className }: { name: SpriteName; className?: string }) {
  const [width, height] = SPRITES[name];
  return (
    <span aria-hidden className={cn("pointer-events-none block select-none", className)}>
      <Image
        src={`/art/sprites/${name}.webp`}
        alt=""
        width={width}
        height={height}
        draggable={false}
        className="h-auto w-full dark:hidden"
      />
      <Image
        src={`/art/sprites/${name}-night.webp`}
        alt=""
        width={width}
        height={height}
        draggable={false}
        className="hidden h-auto w-full dark:block"
      />
    </span>
  );
}
