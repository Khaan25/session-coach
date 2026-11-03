"use client";

import { LaptopIcon, CloudIcon, TerminalWindowIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoopStep } from "@/hooks/use-loop-step";

// One log line on its way out, on a loop of three 2s stages: as written, masked on the laptop, masked again on the
// server. The masks are the CLI's own ([REDACTED], [EMAIL]). The key and address are fakes, short enough that
// the secret scanner leaves them alone.
const parts: ({ text: string } | { secret: string; mask: string; stage: number })[] = [
  { text: "› the key is " },
  { secret: "sk-ant-x7Qe9…", mask: "[REDACTED]", stage: 1 },
  { text: ", mail it to " },
  { secret: "ana@example.com", mask: "[EMAIL]", stage: 1 },
  { text: ", " },
  { secret: "DB_PASSWORD=hunter2", mask: "DB_PASSWORD=[REDACTED]", stage: 2 },
];

const stages = [
  { icon: TerminalWindowIcon, label: "In the session log" },
  { icon: LaptopIcon, label: "Masked on your laptop" },
  { icon: CloudIcon, label: "Masked again on the server" },
];

export function RedactionDemo() {
  const stage = useLoopStep(stages.length, 2000, stages.length - 1);

  return (
    <MotionConfig reducedMotion="user">
      <Card size="lg" className="h-full">
        <CardHeader>
          <CardTitle>Secrets filtered twice</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-soft well p-4 type-code text-text-1">
            {parts.map((part, i) =>
              "text" in part ? (
                <span key={i}>{part.text}</span>
              ) : (
                // The font is monospace, so the slot's width is its text's length in ch. Animating that width
                // slides the rest of the line over, and the secret and mask crossfade in the one grid cell.
                <motion.span
                  key={i}
                  className="box-content inline-grid overflow-hidden align-bottom whitespace-pre"
                  initial={false}
                  animate={
                    stage >= part.stage
                      ? { width: `${part.mask.length}ch`, paddingInline: "0.25rem" }
                      : { width: `${part.secret.length}ch`, paddingInline: "0rem" }
                  }
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <AnimatePresence initial={false}>
                    {stage >= part.stage ? (
                      <motion.span
                        key="mask"
                        className="col-start-1 row-start-1 -mx-1 rounded-inner bg-tile px-1 text-text-2"
                        initial={{ opacity: 0, filter: "blur(4px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {part.mask}
                      </motion.span>
                    ) : (
                      <motion.span
                        key="secret"
                        className="col-start-1 row-start-1 text-warn-text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, filter: "blur(4px)" }}
                        transition={{ duration: 0.25 }}
                      >
                        {part.secret}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.span>
              ),
            )}
          </p>
          <ol className="grid gap-2 sm:grid-cols-3">
            {stages.map(({ icon: Icon, label }, i) => (
              <li
                key={label}
                aria-current={i === stage || undefined}
                className={cn(
                  "relative isolate flex items-center gap-2 rounded-soft px-3 py-2 type-body-sm transition-colors duration-300",
                  i === stage ? "text-accent-label" : "text-text-2",
                )}
              >
                {i === stage && (
                  // One tint that slides from stage to stage, with a 2s fill under it, so the loop reads as a
                  // pipeline.
                  <motion.span
                    aria-hidden
                    layoutId="redaction-stage"
                    className="absolute inset-0 -z-10 overflow-hidden rounded-soft bg-accent-tint"
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.span
                      key={stage}
                      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent-mark"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 2, ease: "linear" }}
                    />
                  </motion.span>
                )}
                <Icon weight="duotone" className="size-4 shrink-0" aria-hidden />
                {label}
              </li>
            ))}
          </ol>
          <p className="type-body-sm text-text-2">
            We try to remove secrets on your laptop before the log is sent, and again on the server
            before it is stored.
          </p>
        </CardContent>
      </Card>
    </MotionConfig>
  );
}
