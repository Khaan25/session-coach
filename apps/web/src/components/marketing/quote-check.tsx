"use client";

import { cn } from "cn";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoopStep } from "@/hooks/use-loop-step";

// The quote check, played on a loop: a card's quote, then a scan down the session log, 250ms a line, then the
// verdict. The first quote is in the log and its line lights up; the second is not, so the card is flagged.
// The log is an example. Reduced motion shows the first verdict still.
const log = [
  "user: add a parser for the transcript",
  "assistant: ESM imports with .js, matching resultSchema.ts's convention",
  "tool: write server/src/lib/transcriptParser.ts",
  "assistant: done, the parser tests pass",
];

const quotes = [
  { quote: "matching resultSchema.ts's convention", line: 1 },
  { quote: "the tests cover every line type", line: null },
];

const SCAN = log.length; // ticks spent scanning
const PER_QUOTE = SCAN + 8; // then 2s on the verdict

export function QuoteCheck() {
  // Starts on the first verdict, so the server and reduced motion show a finished check.
  const tick = useLoopStep(PER_QUOTE * quotes.length, 250, SCAN);
  const q = quotes[Math.floor(tick / PER_QUOTE)];
  const phase = tick % PER_QUOTE;
  const scanning = phase < SCAN ? phase : null;
  const found = scanning === null && q.line !== null;

  return (
    <MotionConfig reducedMotion="user">
      <Card size="lg" className="h-full">
        <CardHeader>
          <CardTitle>Every quote is checked</CardTitle>
        </CardHeader>
        <CardContent>
          <figure className="flex flex-col gap-2 rounded-soft well p-3">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.blockquote
                key={q.quote}
                className="type-body text-text-1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                &ldquo;{q.quote}&rdquo;
              </motion.blockquote>
            </AnimatePresence>
            {/* One grid cell, so the outgoing caption fades out under the incoming one instead of snapping. */}
            <figcaption className="grid min-h-6 items-center type-body-sm text-text-2">
              <AnimatePresence initial={false}>
                {scanning !== null ? (
                  <motion.span
                    key={`${q.quote}-scan`}
                    className="col-start-1 row-start-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    Looking for it in the session…
                  </motion.span>
                ) : (
                  <motion.span
                    key={`${q.quote}-verdict`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="col-start-1 row-start-1 flex origin-left items-center gap-2"
                  >
                    {found ? (
                      <>
                        <Badge variant="success">Found</Badge>
                        Event {(q.line ?? 0) + 1} of the session
                      </>
                    ) : (
                      <>
                        <Badge variant="warning">Flagged</Badge>
                        Not in the session, so the card says so
                      </>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </figcaption>
          </figure>
          <ol aria-label="Session log (example)" className="flex flex-col gap-1">
            {log.map((line, i) => (
              <li
                key={line}
                className={cn(
                  "relative isolate flex gap-3 px-2 py-1.5 type-code-sm transition-colors duration-150",
                  found && q.line === i
                    ? "text-success-text"
                    : scanning === i
                      ? "text-text-1"
                      : "text-text-2",
                )}
              >
                {(scanning === i || (found && q.line === i)) && (
                  // One highlight that slides down the log as it scans, then back up to the line it found.
                  <motion.span
                    aria-hidden
                    layoutId="quote-check-line"
                    className={cn(
                      "absolute inset-0 -z-10 rounded-inner transition-colors duration-150",
                      found ? "bg-success-wash" : "bg-hover",
                    )}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <span aria-hidden className="text-text-3">
                  {i + 1}
                </span>
                <span className="min-w-0 truncate">{line}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </MotionConfig>
  );
}
