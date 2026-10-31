import { Badge } from "@/components/ui/badge";

/** An explain-back score, as the grader writes it to `answers.score`. */
export type Score = 0 | 1 | 2;

// 2 moves the card to its next review day; 1 or 0 restarts it at day 1.
const scoreOf: Record<Score, { variant: "success" | "warning" | "default"; label: string }> = {
  2: { variant: "success", label: "Explained" },
  1: { variant: "warning", label: "Partly" },
  0: { variant: "default", label: "Missed" },
};

/** The score as a word on its wash: success for 2, warning for 1, the neutral tint for 0. Never colour alone. */
export function ScoreBadge({ score }: { score: Score }) {
  const { variant, label } = scoreOf[score];
  return <Badge variant={variant}>{label}</Badge>;
}
