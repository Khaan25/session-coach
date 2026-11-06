import type { ReviewStep } from "@/lib/progress/progress";
/** The artwork identifies a schedule stage; the adjacent count comes from real project progress. */
export function DecisionStage({ stage }: { stage: ReviewStep }) {
  const stack = stage === "day-4" || stage === "day-11" || stage === "mastered";
  return (
    <svg viewBox="0 0 144 164" className="decision-stage-art" aria-hidden="true">
      <ellipse className="decision-stage-shadow" cx="72" cy="153" rx="48" ry="5" />
      {stack && <path className="decision-stage-back" d="m29 14 88 11-13 123-88-11z" />}
      {(stage === "day-11" || stage === "mastered") && (
        <path className="decision-stage-middle" d="m17 29 91-10 14 120-91 10z" />
      )}
      <path className="decision-stage-paper" d="M28 23h66l22 23v99H28z" />
      <path className="decision-stage-fold" d="M94 23v23h22" />
      <path className="decision-stage-hairline" d="M43 57h39" />
      {stage === "new" && <path className="decision-stage-hairline" d="M43 119h56M43 127h35" />}
      {stage === "day-1" && (
        <path className="decision-stage-return" d="M51 137h32a7 7 0 0 0 0-14H66m0 0 5-5m-5 5 5 5" />
      )}
      {stage === "day-4" && (
        <>
          <path className="decision-stage-hairline" d="M43 119h56M43 127h35" />
          <path className="decision-stage-tab" d="M36 15h15v33l-7.5-5-7.5 5z" />
        </>
      )}
      {stage === "day-11" && (
        <>
          <path className="decision-stage-hairline" d="M43 119h56M43 127h35" />
          <path className="decision-stage-tab" d="M36 15h15v33l-7.5-5-7.5 5z" />
          <path className="decision-stage-tab-second" d="M56 15h10v24l-5-3-5 3z" />
        </>
      )}
      {stage === "mastered" && (
        <>
          <path className="decision-stage-band" d="M22 117h100v19H22z" />
          <circle className="decision-stage-seal" cx="96" cy="126.5" r="13" />
          <path className="decision-stage-check" d="m90 126 4 4 8-8" />
        </>
      )}
    </svg>
  );
}
