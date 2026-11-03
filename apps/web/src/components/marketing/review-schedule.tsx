"use client";

import { cn } from "cn";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import { ScoreBadge, type Score } from "@/components/app/score-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoopStep } from "@/hooks/use-loop-step";

// One card's way through the schedule, played on a loop: every 2.2s it is answered, and the marker springs to
// where the score sends it. A 2 moves it to the next gap, less moves it one step down, a 2 on day 7 masters it
// (docs/ARCHITECTURE.md). The track is decorative; the rule is written out under it for everyone.
const stops = ["Session", "Day 1", "Day 3", "Day 7", "Mastered"];

const story: { at: number; score?: Score; note: string }[] = [
  { at: 1, note: "A new card is due on day 1." },
  { at: 2, score: 2, note: "Explained on day 1, so it moves to day 3." },
  { at: 1, score: 1, note: "Partly on day 3, so it starts again at day 1." },
  { at: 2, score: 2, note: "Explained on day 1, so it moves to day 3." },
  { at: 3, score: 2, note: "Explained on day 3, so it moves to day 7." },
  { at: 4, score: 2, note: "Explained on day 7: mastered." },
];

const percent = (stop: number) => `${(stop / (stops.length - 1)) * 100}%`;
// The same five positions as classes, for the static stops.
const stopLeft = ["left-0", "left-1/4", "left-1/2", "left-3/4", "left-full"];

export function ReviewSchedule() {
  const step = useLoopStep(story.length, 2200, story.length - 1);
  const { at, score, note } = story[step];

  return (
    <MotionConfig reducedMotion="user">
      <Card size="lg">
        <CardHeader>
          <CardTitle>One card&rsquo;s week</CardTitle>
        </CardHeader>
        <CardContent>
          <div aria-hidden className="relative mx-6 mt-2 h-12">
            <span className="absolute inset-x-0 top-2 h-px bg-line-row" />
            <motion.span
              className="absolute top-2 left-0 h-px bg-accent-mark"
              animate={{ width: percent(at) }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
            />
            {stops.map((label, i) => (
              <span
                key={label}
                className={cn(
                  "absolute top-0 flex -translate-x-1/2 flex-col items-center gap-2",
                  stopLeft[i],
                )}
              >
                <span
                  className={cn(
                    "size-4 rounded-full transition-colors duration-300",
                    i <= at ? "bg-accent-tint" : "bg-tile",
                  )}
                />
                <span className="type-label-sm whitespace-nowrap text-text-2">{label}</span>
              </span>
            ))}
            <motion.span
              className="absolute top-0 size-4 -translate-x-1/2 rounded-full bg-accent-mark"
              animate={{ left: percent(at) }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
            />
          </div>
          <div aria-hidden className="flex min-h-6 items-center gap-2">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={step}
                className="flex items-center gap-2 type-body text-text-1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {score !== undefined && <ScoreBadge score={score} />}
                {note}
              </motion.span>
            </AnimatePresence>
          </div>
          <p className="sr-only">
            Each card is due on day 1, 3 and 7. A score of 2 moves it to the next day; less moves it
            one step down (never below day 1) and it comes back tomorrow. Passing the last review
            masters it.
          </p>
        </CardContent>
      </Card>
    </MotionConfig>
  );
}
