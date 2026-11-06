import { cn } from "cn";
import Image from "next/image";

// Real pixel sizes of the WebP files in public/art/sprites (the day and night copies share one size).
const SPRITES = {
  // The learning loop, in order: send a session, the evidence, explain it, the review days, own it, defend it.
  laptop: [192, 158],
  evidence: [192, 128],
  explain: [192, 127],
  calendar: [192, 151],
  owned: [192, 142],
  hourglass: [192, 249],
  cards: [192, 160],
  letter: [192, 137],
  pencil: [192, 167],
  plant: [135, 192],
  tea: [192, 187],
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
