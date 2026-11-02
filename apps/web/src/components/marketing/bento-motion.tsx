"use client";

import { BellIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { MotionConfig, motion } from "motion/react";

// The bento's micro motion, on motion.dev. All of it idles in place: nothing waits for a scroll. MotionProvider
// turns off every transform under reduced motion (motion's "user" setting); the dot and caret only fade.

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** The reviews bell: a short ring from its top every 3.5s, like a reminder landing. */
export function RingingBell() {
  return (
    <motion.span
      aria-hidden
      className="origin-top"
      animate={{ rotate: [0, -16, 14, -10, 6, -2, 0] }}
      transition={{ duration: 0.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.7 }}
    >
      <BellIcon className="size-5" />
    </motion.span>
  );
}

/** A dot that breathes, for a "ready" or "live" label. */
export function LiveDot() {
  return (
    <motion.span
      aria-hidden
      className="size-1.5 rounded-full bg-success"
      animate={{ opacity: [1, 0.35, 1] }}
      transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
    />
  );
}

/** The typing caret: solid, then blinking at half-second steps. */
export function Caret() {
  return (
    <motion.span
      aria-hidden
      className="h-4 w-0.5 bg-accent-mark"
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1, times: [0, 0.5, 0.5, 1], repeat: Infinity, ease: "linear" }}
    />
  );
}

/**
 * The week's bars. Each breathes a little from the baseline on its own clock (60ms apart, slower to the right), so
 * the chart reads as live. Today's bar is the accent and keeps pulsing up from its stub as answers come in.
 */
export function WeekBars({ week }: { week: { day: string; bar: string; today?: boolean }[] }) {
  return (
    <ul aria-label="Cards explained each day" className="flex items-end gap-1.5">
      {week.map(({ day, bar, today }, i) => (
        <li key={i} className="flex flex-col items-center gap-1">
          <motion.span
            aria-hidden
            className={cn(
              "w-3 origin-bottom rounded-inner",
              today ? "bg-accent-mark" : "bg-tile",
              bar,
            )}
            animate={{ scaleY: today ? [1, 2.5, 1] : [1, 0.82, 1] }}
            transition={{
              scaleY: {
                duration: today ? 1.4 : 2.4 + i * 0.3,
                delay: i * 0.06,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: today ? 0.6 : 0,
              },
            }}
          />
          <span className={cn("type-label-sm", today ? "text-text-1" : "text-text-3")}>{day}</span>
        </li>
      ))}
    </ul>
  );
}
