"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";

import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { useLoopStep } from "@/hooks/use-loop-step";

// One card's way through the schedule, played on a loop: every 2.2s it is answered, and the marker springs to
// where the score sends it. A 2 moves it to the next gap, less moves it one step down, a 2 on the day-11 review masters it
// (lib/review/schedule.ts). The track is decorative; the rule is written out under it for everyone.
const stops = [
  { label: "New", stage: "new" },
  { label: "Day 1", stage: "day-1" },
  { label: "Day 4", stage: "day-4" },
  { label: "Day 11", stage: "day-11" },
  { label: "Owned", stage: "mastered" },
] as const;

const story: { at: number; score?: Score; note: string }[] = [
  { at: 1, note: "A new card is due on day 1." },
  { at: 2, score: 2, note: "Explained on day 1, so it's due 3 days later." },
  { at: 1, score: 1, note: "Partly on day 4, so it drops a step, due tomorrow." },
  { at: 2, score: 2, note: "Explained, so it's due 3 days later again." },
  { at: 3, score: 2, note: "Explained again, so it's due 7 days later." },
  { at: 4, score: 2, note: "Explained on the day 11 review: owned." },
];

export function ReviewSchedule() {
  const step = useLoopStep(story.length, 2200, story.length - 1);
  const { at, score, note } = story[step];

  return (
    <MotionConfig reducedMotion="user">
      <figure className="studio-recall-study">
        <figcaption className="studio-recall-caption">One decision. Three returns.</figcaption>
        <ol
          className="studio-recall-sheets"
          aria-label="A decision returns on day 1, day 4 and day 11"
        >
          {stops.map(({ label, stage }, i) => (
            <li key={stage} data-active={i === at} data-passed={i < at}>
              <strong className="recall-date">
                {i === 0 ? "Start" : i === 4 ? "Yours" : label.replace("Day ", "")}
              </strong>
              <span>{label}</span>
            </li>
          ))}
        </ol>
        <div className="studio-recall-response" aria-hidden="true">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {score !== undefined && <ScoreBadge score={score} />}
              {note}
            </motion.p>
          </AnimatePresence>
        </div>
        <p className="studio-recall-rule">
          Correct on day 11 means owned; a 0 or 1 brings it back tomorrow.
        </p>
      </figure>
    </MotionConfig>
  );
}
