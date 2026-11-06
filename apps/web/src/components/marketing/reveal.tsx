"use client";

import { cn } from "cn";
import { MotionConfig, motion } from "motion/react";

// A marketing block that blurs in once as it scrolls into view: --enter-blur, --enter-rise and --dur-reveal on
// --ease-out-expo (motion takes numbers, so the token values are repeated here). Reduced motion shows the block as it
// is: the motion-reduce classes override the inline start styles, so nothing waits on a scroll that never animates.
const hidden = { opacity: 0, filter: "blur(8px)", y: 12 };
const shown = { opacity: 1, filter: "blur(0px)", y: 0 };

export function Reveal({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={hidden}
        whileInView={shown}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "motion-reduce:transform-none! motion-reduce:opacity-100! motion-reduce:filter-none!",
          className,
        )}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
