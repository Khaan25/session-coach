import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { CHART_EMPTY, EMPTY_VALUE } from "@/lib/quartz/format";
import type { Kind } from "@/lib/quartz/kind";

// Quartz's sparkline: the small line or bars beside a number. Reads right to left under dir="rtl": the
// drawing mirrors. A screen reader gets a hidden table of the values, captioned with one sentence of trend.
// shortcut: Quartz's `interactive` mode (focusable points with a tooltip) is not ported, since it needs Quartz's
// chart tooltip and roving-focus parts; port them with it when a sparkline needs hover values.

const sparklineVariants = cva("relative inline-block min-w-0 align-middle", {
  variants: {
    size: {
      sm: "h-4",
      default: "h-(--control-xs)",
      lg: "h-(--row-sm)",
    },
  },
  defaultVariants: { size: "default" },
});

type SparklineProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof sparklineVariants> & {
    /** Values in order, oldest first. null is a gap. */
    data: (number | null)[];
    /** What the values are: "Runs per hour". Names the table. */
    label: string;
    /** The kind the values belong to. Sets the hue; ink without one. */
    kind?: Kind;
    variant?: "line" | "bar";
    /** A flat wash under the line. */
    area?: boolean;
    /** Mark the last value. On for lines. */
    end?: boolean;
    /** Names for each point, for the table: dates or bucket labels. */
    labels?: string[];
    valueFormat?: (value: number) => string;
  };

const VIEW_H = 100;
const PAD = 8;

/** The sentence a screen reader hears for the values: "up from 412 to 549, low 401, high 549". */
function trendWords(values: number[], format: (v: number) => string) {
  if (!values.length) return "no data";
  const first = values[0],
    last = values[values.length - 1];
  const direction = last > first ? "up" : last < first ? "down" : "flat";
  return `${direction} from ${format(first)} to ${format(last)}, low ${format(Math.min(...values))}, high ${format(Math.max(...values))}`;
}

function Sparkline({
  data,
  label,
  kind,
  variant = "line",
  area,
  end = variant === "line",
  labels,
  valueFormat = (v) => v.toLocaleString("en-US"),
  size = "default",
  className,
  ...props
}: SparklineProps) {
  const values = data.filter((v): v is number => v !== null && Number.isFinite(v));
  const n = data.length;
  const lo = variant === "bar" ? Math.min(0, ...values) : Math.min(...values);
  const hi = Math.max(...values, lo + 1);
  const viewW = Math.max(n - 1, 1) * 10;
  const y = (v: number) => PAD + (1 - (v - lo) / (hi - lo || 1)) * (VIEW_H - PAD * 2);
  const x = (i: number) =>
    variant === "bar" ? (i + 0.5) * (viewW / n) : n === 1 ? viewW / 2 : (i / (n - 1)) * viewW;
  const nameAt = (i: number) => labels?.[i] ?? `Point ${i + 1}`;

  const segments: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  data.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) {
      if (run.length) segments.push(run);
      run = [];
      return;
    }
    run.push({ x: x(i), y: y(v) });
  });
  if (run.length) segments.push(run);

  const lastIndex = data.findLastIndex((v) => v !== null && Number.isFinite(v));
  const lastValue = lastIndex >= 0 ? data[lastIndex] : null;
  const pct = (px: number, total: number) => `${(px / total) * 100}%`;

  // A div, not a span: it holds the data table. It stays inline-block, so it still sits in a line of text; do not put it inside a <p>.
  return (
    <div
      data-slot="sparkline"
      data-kind={kind}
      data-variant={variant}
      className={cn(sparklineVariants({ size }), "w-24", className)}
      {...props}
    >
      {/* sr-only sits on a wrapper: a table ignores width and overflow, so on the table itself it stays
          as wide as its rows and pushes the page sideways. */}
      <div className="sr-only">
        <table data-slot="chart-data-table">
          <caption>{`${label}: ${trendWords(values, valueFormat)}`}</caption>
          <thead>
            <tr>
              <th scope="col">Point</th>
              <th scope="col">{label}</th>
            </tr>
          </thead>
          <tbody>
            {n === 0 ? (
              <tr>
                <td colSpan={2}>{CHART_EMPTY}</td>
              </tr>
            ) : (
              data.map((v, i) => (
                <tr key={i}>
                  <th scope="row">{nameAt(i)}</th>
                  <td>{v === null ? EMPTY_VALUE : valueFormat(v)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Right to left mirrors the drawing, which has no text, so the first value sits at the right. */}
      <svg
        aria-hidden
        viewBox={`0 0 ${viewW} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="block size-full overflow-visible rtl:-scale-x-100"
      >
        {variant === "bar" ? (
          data.map(
            (v, i) =>
              v !== null &&
              Number.isFinite(v) && (
                <rect
                  key={i}
                  x={x(i) - (viewW / n) * 0.35}
                  width={(viewW / n) * 0.7}
                  y={Math.min(y(v), y(0))}
                  height={Math.max(Math.abs(y(0) - y(v)), 2)}
                  className="fill-accent-line"
                />
              ),
          )
        ) : (
          <>
            {area &&
              segments.map(
                (pts, i) =>
                  pts.length > 1 && (
                    <path
                      key={`a${i}`}
                      d={`M${pts[0].x},${VIEW_H}${pts.map((p) => `L${p.x},${p.y}`).join("")}L${pts[pts.length - 1].x},${VIEW_H}Z`}
                      className="fill-accent-wash"
                    />
                  ),
              )}
            {/* A point with gaps on both sides is a dot: a zero-length stroke with round caps, so
                the stretched viewBox cannot squash it into an oval. */}
            {segments.map(
              (pts, i) =>
                pts.length === 1 && (
                  <path
                    key={`d${i}`}
                    d={`M${pts[0].x},${pts[0].y}h0`}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    className="fill-none stroke-accent-line stroke-(length:--space-1)"
                  />
                ),
            )}
            {segments.map(
              (pts, i) =>
                pts.length > 1 && (
                  <path
                    key={i}
                    d={pts.map((p, j) => `${j ? "L" : "M"}${p.x},${p.y}`).join("")}
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className={cn(
                      "fill-none stroke-accent-line",
                      size === "sm"
                        ? "stroke-(length:--line-hair)"
                        : "stroke-(length:--line-accent)",
                    )}
                  />
                ),
            )}
          </>
        )}
      </svg>
      {variant === "line" && end && lastValue !== null && (
        <span
          aria-hidden
          data-slot="sparkline-end"
          className="pointer-events-none absolute start-(--end-x) top-(--end-y) size-1.5 -translate-x-1/2 -translate-y-1/2 bg-accent-line rtl:translate-x-1/2"
          style={
            {
              "--end-x": pct(x(lastIndex), viewW),
              "--end-y": pct(y(lastValue), VIEW_H),
            } as React.CSSProperties
          }
        />
      )}
    </div>
  );
}

export { Sparkline, sparklineVariants, type SparklineProps };
