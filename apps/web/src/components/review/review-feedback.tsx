import { EngineeringGuide, LearningMark } from "@/components/art/engineering-illustrations";
import { useId, useEffect, useRef, type Ref } from "react";
import { SessionEvidence } from "@/components/cards/session-evidence";
import type { Evidence } from "@session-coach/shared/decision";
import type { Score } from "@/components/app/score-badge";
import { ProjectLink as Link } from "@/components/projects/project-link";
import { buttonVariants } from "@/components/ui/button";
import { Collapsible, CollapsibleRow, CollapsibleContent } from "@/components/ui/collapsible";
export type ReviewResult = {
  score: Score;
  missing: string;
  why: string;
  modelAnswer: string;
  evidence: Evidence[];
  nextDue: string | null;
  dropped: boolean;
};
const formatDue = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
export function ReviewFeedback({
  result,
  answer,
  skipped,
  nextHref,
  finishHref = "/review/complete",
  headingRef,
}: {
  result: ReviewResult;
  answer: string;
  skipped: boolean;
  nextHref: string | null;
  finishHref?: string;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const id = useId();
  const owned = result.nextDue === null;
  const surface = useRef<HTMLDivElement>(null),
    advance = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const node = surface.current;
    let start: { x: number; y: number } | null = null;
    const key = (event: KeyboardEvent) => {
      if (
        event.key !== "ArrowRight" ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const target = event.target as HTMLElement;
      if (
        target.closest(
          "input,textarea,select,[contenteditable=true],[role=dialog],[role=menu],[role=listbox]",
        )
      )
        return;
      event.preventDefault();
      advance.current?.click();
    };
    const down = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const point = event.touches[0]!;
        start = { x: point.clientX, y: point.clientY };
      }
    };
    const up = (event: TouchEvent) => {
      const point = event.changedTouches[0];
      if (
        start &&
        point &&
        start.x - point.clientX > 80 &&
        Math.abs(start.y - point.clientY) < 40 &&
        !window.getSelection()?.toString()
      )
        advance.current?.click();
      start = null;
    };
    document.addEventListener("keydown", key);
    node?.addEventListener("touchstart", down, { passive: true });
    node?.addEventListener("touchend", up, { passive: true });
    return () => {
      document.removeEventListener("keydown", key);
      node?.removeEventListener("touchstart", down);
      node?.removeEventListener("touchend", up);
    };
  }, []);
  return (
    <div
      ref={surface}
      className="learning-feedback"
      data-review-result=""
      data-outcome={result.score}
    >
      <header className="coach-outcome-header">
        <div>
          <p className="learning-overline">
            {owned ? "Decision owned" : skipped ? "A starting point" : `${result.score} of 2`}
          </p>
          <h1 ref={headingRef} tabIndex={-1}>
            {owned
              ? "You own this decision."
              : skipped
                ? "Not yet"
                : result.score === 2
                  ? "Got it"
                  : result.score === 1
                    ? "Half there"
                    : "Not yet"}
          </h1>
        </div>
        <EngineeringGuide
          pose={owned || (!skipped && result.score === 2) ? "complete" : "reflect"}
          size="mini"
        />
      </header>
      {!skipped && result.score < 2 && result.missing && (
        <section>
          <h2 className="learning-section-caption">
            <LearningMark kind="recall" size="small" />
            What you missed
          </h2>
          <p>{result.missing}</p>
        </section>
      )}
      <section aria-labelledby={id}>
        <h2 id={id} className="learning-section-caption">
          <LearningMark kind="explain" size="small" />
          An explanation to learn from
        </h2>
        <p>{result.modelAnswer}</p>
      </section>
      <SessionEvidence evidence={result.evidence} variant="summary" />
      <Collapsible>
        <CollapsibleRow>More context{!skipped ? " & your explanation" : ""}</CollapsibleRow>
        <CollapsibleContent>
          <div className="learning-disclosure-body">
            <h2>Why this choice was made</h2>
            <p>{result.why}</p>
            {!skipped && (
              <>
                <h2>Your explanation</h2>
                <p>{answer.trim()}</p>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <p className="learning-footnote">
        {result.nextDue ? (
          <>
            Back on <time dateTime={result.nextDue}>{formatDue(result.nextDue)}</time>.
          </>
        ) : (
          "You completed the day 11 review."
        )}
      </p>
      <Link ref={advance} href={nextHref ?? finishHref} className={buttonVariants()}>
        {nextHref ? "Next decision →" : "Finish review →"}
      </Link>
    </div>
  );
}
