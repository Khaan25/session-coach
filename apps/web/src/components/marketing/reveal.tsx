"use client";

import { cn } from "cn";
import { MotionConfig, motion, useAnimationControls } from "motion/react";
import { useEffect, useRef } from "react";

// A marketing block that blurs in once as it scrolls into view: --enter-blur, --enter-rise and --dur-reveal on
// --ease-out-expo (motion takes numbers, so the token values are repeated here). The server renders the block shown,
// so nothing waits on JavaScript (on a slow phone the steps sat blank for seconds); once hydrated, only blocks still
// below the fold are hidden, off screen, to reveal on scroll. Reduced motion shows the block as it is: the
// motion-reduce classes override the hidden styles.
// shortcut: these copy --enter-blur (8px), --enter-rise (12px), --dur-reveal (0.7s) and --ease-out-expo; retune both together.
const hidden = { opacity: 0, filter: "blur(8px)", y: 12 };
const shown = { opacity: 1, filter: "blur(0px)", y: 0 };

export function Reveal({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  useEffect(() => {
    if (ref.current && ref.current.getBoundingClientRect().top > window.innerHeight)
      controls.set(hidden);
  }, [controls]);
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={ref}
        initial={false}
        animate={controls}
        onViewportEnter={() => controls.start(shown)}
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
