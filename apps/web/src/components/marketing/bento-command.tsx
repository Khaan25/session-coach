"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { Caret } from "@/components/marketing/bento-motion";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";

// The bento's terminal: one tab per CLI step, each typing its command, holding it, deleting it and typing what it
// does, on a loop. Timing from the reference (.reanimate/bento/spec.md rows 3-6): 40ms a character typed, 18ms
// deleted, a 1200ms hold. The selection cuts, as the segmented control always does. Reduced motion shows the
// command still. Screen readers get both lines once, not the typing.
const steps = [
  { value: "login", lines: ["session-coach login", "# approve this device in your browser"] },
  {
    value: "push",
    lines: ["session-coach push --latest", "# uploads your latest session"],
  },
  {
    value: "sync",
    lines: ["session-coach sync", "# SessionStart hook: uploads finished sessions"],
  },
] as const;

const TYPE_MS = 40;
const DELETE_MS = 18;
const HOLD_MS = 1200;
const GAP_MS = 250;

/**
 * Types, holds and deletes each line in turn. `startFull` begins on the first line already typed. Under reduced
 * motion, followed live, it shows the first line and the timers stop.
 */
function useTypedLines(lines: readonly string[], startFull: boolean) {
  const [text, setText] = useState(startFull ? lines[0] : "");
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let line = 0;
    let chars = startFull ? lines[0].length : 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      const full = lines[line];
      if (!deleting && chars < full.length) {
        chars++;
        setText(full.slice(0, chars));
        timer = setTimeout(tick, chars === full.length ? HOLD_MS : TYPE_MS);
      } else if (!deleting) {
        deleting = true;
        tick();
      } else if (chars > 0) {
        chars--;
        setText(full.slice(0, chars));
        timer = setTimeout(tick, chars === 0 ? GAP_MS : DELETE_MS);
      } else {
        deleting = false;
        line = (line + 1) % lines.length;
        tick();
      }
    }

    timer = setTimeout(tick, startFull ? HOLD_MS : GAP_MS);
    return () => clearTimeout(timer);
  }, [lines, startFull, reduced]);

  return reduced ? lines[0] : text;
}

function TypedLine({ lines, startFull }: { lines: readonly string[]; startFull: boolean }) {
  const text = useTypedLines(lines, startFull);
  return (
    <p className="flex min-h-6 items-center gap-2 type-code text-text-1">
      <span aria-hidden className="text-text-3">
        ›
      </span>
      <span aria-hidden className="whitespace-pre">
        {text}
      </span>
      <Caret />
      <span className="sr-only">{lines.join(", ")}</span>
    </p>
  );
}

export function BentoCommand() {
  const [step, setStep] = useState<string>(steps[0].value);
  const [touched, setTouched] = useState(false);
  const current = steps.find((s) => s.value === step) ?? steps[0];

  return (
    <div className="frame flex flex-col gap-3 rounded-soft bg-page p-3">
      <div className="flex items-center justify-between gap-3">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2 rounded-full bg-tile" />
          <span className="size-2 rounded-full bg-tile" />
          <span className="size-2 rounded-full bg-tile" />
        </span>
        <SegmentedControl
          size="xs"
          value={step}
          onValueChange={(value) => {
            setStep(value);
            setTouched(true);
          }}
          aria-label="CLI step"
        >
          {steps.map((s) => (
            <SegmentedControlItem key={s.value} value={s.value}>
              {s.value}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
      <TypedLine key={current.value} lines={current.lines} startFull={!touched} />
    </div>
  );
}
