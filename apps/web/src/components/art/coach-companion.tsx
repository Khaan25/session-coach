import { EngineeringGuide } from "@/components/art/engineering-illustrations";
export type CompanionPose = "hero" | "reflect" | "complete" | "defend" | "connect";
export function CoachCompanion({
  pose = "hero",
  size = "scene",
}: {
  pose?: CompanionPose;
  size?: "mini" | "small" | "scene" | "hero";
  priority?: boolean;
}) {
  return <EngineeringGuide pose={pose} size={size} />;
}
