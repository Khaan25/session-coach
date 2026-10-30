// A hand-drawn underline: one long stroke and a shorter return stroke, drawn in with SMIL so the wipe needs no
// keyframes in globals.css. keySplines is ease-out-quint (0.22, 1, 0.36, 1), the curve the reference's 650ms wipe uses.
// Under reduced motion the animated strokes hide and a static copy shows.

const strokes = [
  { d: "M3 13 C 52 7, 104 5, 150 8 S 236 14, 297 7", width: 3, begin: "0.6s", dur: "0.65s" },
  { d: "M34 19 C 92 14, 168 12, 262 15", width: 2, begin: "1.05s", dur: "0.45s" },
];

export function HandUnderline({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 24"
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      data-kind="run"
      className={className}
    >
      <g className="motion-reduce:hidden">
        {strokes.map((s) => (
          <path
            key={s.d}
            d={s.d}
            strokeWidth={s.width}
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1}
          >
            <animate
              attributeName="stroke-dashoffset"
              from="1"
              to="0"
              begin={s.begin}
              dur={s.dur}
              fill="freeze"
              calcMode="spline"
              keyTimes="0;1"
              keySplines="0.22 1 0.36 1"
            />
          </path>
        ))}
      </g>
      <g className="hidden motion-reduce:inline">
        {strokes.map((s) => (
          <path key={s.d} d={s.d} strokeWidth={s.width} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </svg>
  );
}
