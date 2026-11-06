/** A session page, its source lines, and the point where decisions become available. */
export function SessionStateIllustration({ state }: { state: "reading" | "error" | "empty" }) {
  return (
    <div className="session-state-illustration" data-session-art={state} aria-hidden>
      <svg viewBox="0 0 460 310" fill="none">
        <path
          className="state-art-thread"
          d="M-10 228C68 158 100 281 183 205S307 94 374 162S428 209 470 166"
        />
        <path className="state-art-paper" d="M108 42H245L282 79V247H108Z" />
        <path className="state-art-fold" d="M245 42V79H282" />
        <path
          className="state-art-ink"
          d="M132 103H230M132 120H247M132 137H219M132 168H179M132 185H199M132 202H177"
        />
        <path className="state-art-highlight" d="M132 151H238" />
        <path className="state-art-handle" d="M304 206L337 240" />
        <circle className="state-art-lens" cx="269" cy="168" r="56" />
        {state === "error" ? (
          <>
            <path className="state-art-glyph" d="M269 143V174" />
            <circle className="state-art-dot" cx="269" cy="189" r="2.5" />
          </>
        ) : state === "empty" ? (
          <>
            <path className="state-art-glyph" d="M250 168H288" />
            <circle className="state-art-dashed" cx="269" cy="168" r="37" />
          </>
        ) : (
          <>
            <path className="state-art-glyph" d="M245 177L259 163L272 174L293 150" />
            <path className="state-art-glyph" d="M284 150H293V159" />
            <circle
              className="state-art-scan"
              cx="269"
              cy="168"
              r="45"
              pathLength="100"
              strokeDasharray="15 10"
            />
          </>
        )}
        <path className="state-art-spark" d="M365 64V84M355 74H375M70 86V100M63 93H77" />
        <circle className="state-art-small-dot" cx="368" cy="260" r="5" />
      </svg>
    </div>
  );
}
