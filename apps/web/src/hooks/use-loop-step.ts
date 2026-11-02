import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Steps 0, 1 … count-1 and round again, one step every `stepMs`, for the landing's looping demos. `start` is what
 * the server renders, so make it the demo's finished state. Under reduced motion it shows `start` and the loop
 * waits; it follows the preference live, so switching it while the page is open stops or resumes the loop.
 */
export function useLoopStep(count: number, stepMs: number, start = 0) {
  const [step, setStep] = useState(start);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setStep((i) => (i + 1) % count), stepMs);
    return () => clearInterval(timer);
  }, [count, stepMs, reduced]);

  return reduced ? start : step;
}
