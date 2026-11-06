"use client";
import { useState } from "react";
import { ArrowRightIcon, CheckCircleIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { nextReview, type Step, type Score } from "@/lib/review/schedule";

const labels = ["First try", "Revisit 1", "Revisit 2", "Revisit 3"];
const scores: { value: Score; label: string; description: string }[] = [
  { value: 0, label: "Missed", description: "The reasoning is missing." },
  { value: 1, label: "Partly", description: "Some reasoning, with a gap." },
  { value: 2, label: "Explained", description: "The reasoning is there." },
];

/** Uses the product's existing scheduler, never a separate approximation of the rules. */
export function ReviewJourney() {
  const [step, setStep] = useState<Step>(1);
  const [score, setScore] = useState<Score | null>(null);
  const result = score === null ? null : nextReview(step, score, "2026-11-03");
  return (
    <div className="review-journey">
      <div className="journey-chart" data-review-step={step}>
        <div className="journey-chart-top">
          <span className="eyebrow">One decision. Gaps of 1, 3 and 7 days.</span>
          <span className="small-tag">Try the review stages</span>
        </div>
        <svg viewBox="0 0 680 170" fill="none" aria-hidden>
          <path className="journey-track" d="M100 115C200 115 240 40 340 40S480 115 580 115" />
          <path
            className="journey-track-active"
            d="M100 115C200 115 240 40 340 40S480 115 580 115"
          />
          <circle data-current={step === 1} cx="100" cy="115" r="7" />
          <circle data-current={step === 2} cx="340" cy="40" r="7" />
          <circle data-current={step === 3} cx="580" cy="115" r="7" />
        </svg>
        <div className="journey-days">
          {([1, 2, 3] as Step[]).map((value) => (
            <button
              key={value}
              className="journey-day"
              type="button"
              aria-pressed={step === value}
              onClick={() => {
                setStep(value);
                setScore(null);
              }}
            >
              <span>REVIEW {value}</span>
              <strong>{labels[value]}</strong>
              <small>{["", "Explain it", "Recall it", "Own the reasoning"][value]}</small>
            </button>
          ))}
        </div>
        <div className="journey-result" aria-live="polite">
          {result ? (
            <>
              <CheckCircleIcon aria-hidden />
              <p>
                {result.mastered ? (
                  <>
                    <strong>Mastered.</strong> This card stops coming back.
                  </>
                ) : (
                  <>
                    <strong>Next: {labels[result.step]}.</strong>{" "}
                    {score === 2
                      ? "The card moves to the next review gap."
                      : "One step back, never below the first revisit. It returns tomorrow."}
                  </>
                )}
              </p>
            </>
          ) : (
            <>
              <ArrowRightIcon aria-hidden />
              <p>Choose a review stage, then an answer score. See what happens next.</p>
            </>
          )}
        </div>
      </div>
      <div className="journey-controls">
        <span className="eyebrow">Understanding, not completion</span>
        <h3>
          What happens
          <br />
          when you answer?
        </h3>
        <p>The score changes when you see a card again. Try it with the same rules the app uses.</p>
        <div className="journey-scores">
          {scores.map((item) => (
            <button
              type="button"
              className="journey-score"
              key={item.value}
              aria-pressed={score === item.value}
              onClick={() => setScore(item.value)}
            >
              <span>{item.value}</span>
              <div>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </div>
              <ArrowRightIcon aria-hidden />
            </button>
          ))}
        </div>
        <button
          className="journey-reset"
          type="button"
          onClick={() => {
            setScore(null);
            setStep(1);
          }}
        >
          <ArrowCounterClockwiseIcon aria-hidden />
          Reset example
        </button>
      </div>
    </div>
  );
}
