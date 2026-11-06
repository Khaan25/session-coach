import { useId } from "react";

/** The session ribbon, evidence lens and check share the website's illustration language. */
export function GuidanceIllustration({
  state = "start",
}: {
  state?: "start" | "processing" | "practice" | "complete" | "error";
}) {
  const id = useId().replaceAll(":", "");
  return (
    <div className="guidance-illustration" data-guidance={state} aria-hidden>
      <svg viewBox="0 0 420 270" fill="none">
        <defs>
          <path id={id} d="M-30 169C59 103 104 226 186 153S282 72 333 130S411 184 450 131" />
        </defs>
        <ellipse className="guidance-field" cx="221" cy="132" rx="99" ry="94" />
        <g className="guidance-globe">
          <ellipse cx="221" cy="132" rx="80" ry="77" />
          <ellipse cx="221" cy="132" rx="38" ry="77" />
          <path d="M145 112H297M145 151H297" />
        </g>
        <use href={"#" + id} className="guidance-ribbon" />
        <path
          className="guidance-thread"
          d="M-30 208C72 151 96 251 186 202S294 140 355 190S400 231 450 199"
        />
        <g>
          <circle className="guidance-lens" cx="221" cy="132" r="46" />
          {state === "complete" ? (
            <path className="guidance-glyph" d="M203 132L216 145L242 119" />
          ) : state === "error" ? (
            <>
              <path className="guidance-glyph" d="M221 111V136" />
              <circle className="guidance-dot" cx="221" cy="150" r="2" />
            </>
          ) : state === "start" ? (
            <path className="guidance-glyph" d="M207 121L219 132L207 143M230 145H243" />
          ) : (
            <>
              <path className="guidance-glyph" d="M202 137L215 124L227 137L240 118" />
              <path className="guidance-glyph" d="M232 118H240V126" />
            </>
          )}
          <path className="guidance-handle" d="M256 166L280 193" />
        </g>
        <circle className="guidance-speck" cx="76" cy="64" r="7" />
        <path className="guidance-spark" d="M347 45V69M335 57H359M339 49L355 65M355 49L339 65" />
      </svg>
    </div>
  );
}
