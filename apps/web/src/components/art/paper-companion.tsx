import Image from "next/image";

/** Original agent illustration; the legacy API keeps every learner flow consistent. */
export function PaperCompanion({
  pose = "hero",
  size = "scene",
  eager = false,
}: {
  pose?: "hero" | "reflect" | "complete" | "defend" | "connect";
  size?: "mini" | "small" | "scene" | "hero";
  eager?: boolean;
}) {
  return (
    <span className="paper-companion" data-pose={pose} data-size={size} aria-hidden="true">
      <Image
        src="/art/companion/agent-v6.webp"
        alt=""
        width={1312}
        height={1199}
        sizes="(max-width: 700px) 240px, 360px"
        loading={eager ? "eager" : "lazy"}
      />
    </span>
  );
}
