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
  { text: " from " },
  { secret: "db-pass-41", mask: "[REDACTED]", stage: 2 },
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
                <AnimatePresence key={i} mode="popLayout" initial={false}>
                  {stage >= part.stage ? (
                    <motion.span
                      key="mask"
                      className="rounded-inner bg-tile px-1 text-text-2"
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
                      className="text-warn-text"
                      exit={{ opacity: 0, filter: "blur(4px)" }}
                      transition={{ duration: 0.2 }}
                    >
                      {part.secret}
                    </motion.span>
                  )}
                </AnimatePresence>
              ),
            )}
          </p>
          <ol className="grid gap-2 sm:grid-cols-3">
            {stages.map(({ icon: Icon, label }, i) => (
              <li
                key={label}
                aria-current={i === stage || undefined}
                className={cn(
                  "relative flex items-center gap-2 overflow-hidden rounded-soft px-3 py-2 type-body-sm transition-colors duration-300",
                  i === stage ? "bg-accent-tint text-accent-label" : "text-text-2",
                )}
              >
                <Icon weight="duotone" className="size-4 shrink-0" aria-hidden />
                {label}
                {i === stage && (
                  // A 2s fill under the stage in progress, so the loop reads as a pipeline.
                  <motion.span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent-mark"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 2, ease: "linear" }}
                  />
                )}
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
