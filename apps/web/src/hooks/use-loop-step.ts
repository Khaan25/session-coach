import { useEffect, useState } from "react";

/**
 * Steps 0, 1 … count-1 and round again, one step every `stepMs`, for the landing's looping demos. Under reduced
 * motion it stays on `start`, which is also what the server renders.
 */
export function useLoopStep(count: number, stepMs: number, start = 0) {
  const [step, setStep] = useState(start);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setStep((i) => (i + 1) % count), stepMs);
    return () => clearInterval(timer);
  }, [count, stepMs]);

  return step;
}
