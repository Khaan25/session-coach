"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Kind } from "@/lib/quartz/kind";
import { durationUnitFor, formatDurations } from "@/lib/quartz/format";
import { useOffscreen } from "@/lib/quartz/use-offscreen";
import { cn } from "cn";

import { niceScale } from "@/components/ui/chart-scale";
import { Status, statusLabels } from "@/components/ui/status";

// Quartz's timeline: when each step of a run started and how long it took, with the slow and failed ones marked. It
// answers the question every agent product gets asked: where did the 12.6s go, and which step broke? It shows what
// happened, never a plan.
//
// One frame: a 40px header over a row rule (the label, the total time, the run's outcome), then an axis row
// with nice ticks in one unit, and a row per span: the name indented by depth, then a 16px bar in the span's kind (its mark step) on a track
// that ends at the run's total, with the duration right after the bar's end (inside a bar wide enough to hold it, before a bar with no room to
// its end; fit is measured in px on the track, which stops 16px short of the frame's edge so a bar ending at the total does not touch it). Wide frames add a status column that names only trouble; narrow ones drop it, hide the meta
// and let the bar's colour and the header carry the outcome. A running span's bar grows to `now` with no end, easing
// along between ticks of the clock. A failed or slow span turns its bar red or amber, and a failed row takes a faint wash. A span
// waiting on a person draws a paper bar with an ink edge from its start to now, and the waiting label.
//
// bars="quiet" is the trace look: the bars are grey, so a long run reads as shape first; the open span's bar takes the
// timeline's kind (run blue by default), and a warn or failed span keeps its amber or red. A nested span draws a 1px
// guide under its parent's indent, so the name column reads as a tree. `footer` adds a strip under the rows behind a
// rule, for the open span's details.
//
// Rows are one tab stop when onSpanClick is set: Up and Down move, Home and End jump, Enter opens. Each row is named
// "{label}, started at 1.2s, took 0.8s, failed". A screen-reader table carries the same data, as a chart's does.

type TimelineStatus = "queued" | "running" | "ok" | "warn" | "fail" | "waiting";

type TimelineSpan = {
  id: string;
  label: string;
  /** ms from the run's start. */
  start: number;
  /** ms from the run's start. Missing while the span runs or waits. */
  end?: number;
  status?: TimelineStatus;
  /** The wait in words, only when it is a different state from "Waiting on you": "Waiting on the on-call". */
  waitingLabel?: string;
  /** The bar's colour: agent, run, model. */
  kind?: Kind;
  /** 0 for a top-level span. */
  depth?: number;
  /** After the name in type-tag: an id, a tool name. Hidden under 448px. */
  meta?: React.ReactNode;
  /** At the name column's end in type-tag and tabular figures, text-3: "4.8k tok", "$0.021". Hidden under 448px, and when the name column is narrower than 256px so the name keeps its room. */
  figure?: React.ReactNode;
};

type TimelineProps = Omit<React.ComponentProps<"section">, "children"> & {
  /** The header's title and the timeline's accessible name: "Run run_8f2a91". */
  label: string;
  spans: TimelineSpan[];
  /** ms from the start, for spans still running or waiting. The caller ticks it, once a second while live. */
  now?: number;
  /** The open span: a soft wash on its row. */
  activeId?: string;
  onSpanClick?: (span: TimelineSpan) => void;
  /** The kind the run belongs to. */
  kind?: Kind;
  /** px. The body scrolls past it, and rows window past 200 spans. */
  maxHeight?: number;
  /** Placeholder bars while the spans load. */
  loading?: boolean;
  /** kind: every bar in its kind's hue. quiet: grey bars; the open span's bar takes the kind, trouble keeps its amber or red. */
  bars?: "kind" | "quiet";
  /** A strip inside the frame under the rows, for the open span's details. */
  footer?: React.ReactNode;
  /** Row height: default 40px (--row), sm 32px (--row-sm) for a dense trace beside other content. */
  size?: "default" | "sm";
};

const ROW = { default: 40, sm: 32 } as const;
const WINDOW_FROM = 200;
const statusWord = (s: TimelineSpan) =>
  s.status === "waiting"
    ? (s.waitingLabel ?? statusLabels.waiting)
    : s.status
      ? statusLabels[s.status]
      : "";

function Timeline({
  label,
  spans,
  now,
  activeId,
  onSpanClick,
  kind,
  maxHeight,
  loading = false,
  bars = "kind",
  footer,
  size = "default",
  className,
  ...props
}: TimelineProps) {
  const ends = spans.map((s) => s.end ?? now ?? s.start);
  const total = Math.max(1, ...ends, now ?? 0);
  // Ticks fall on whole steps of the timeline's one unit: 0, 1, 2, 3 min, never 0.8 min.
  const { unit, size: unitSize } = durationUnitFor([total]);
  const unitScale = niceScale(0, total / unitSize, 4);
  // The track ends at the run's total, not at the next nice number, so the last bar reaches the edge and no empty
  // third is left; the ticks are the nice ones below it.
  const ticks = unitScale.ticks.filter((t) => t * unitSize <= total + 1e-6);
  const scale = { max: total, ticks: ticks.map((t) => t * unitSize) };
  const span = scale.max || 1;
  const frac = (ms: number) => Math.min(Math.max(ms, 0), span) / span;
  const at = (ms: number) => `${frac(ms) * 100}%`;
  const durations = formatDurations(spans.map((s, i) => ends[i] - s.start)).values;
  const tickLabels = ticks.map((t) => `${t.toLocaleString("en-US")}${unit}`);
  const totalLabel = formatDurations([total]).values[0];
  const running = spans.some(
    (s) =>
      s.status === "running" ||
      (s.end === undefined && s.status !== "waiting" && s.status !== "queued"),
  );
  const failed = spans.some((s) => s.status === "fail");
  const frameRef = useOffscreen<HTMLElement>(running);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const windowed = !!maxHeight && spans.length >= WINDOW_FROM;
  const virtualizer = useVirtualizer({
    count: windowed ? spans.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW[size],
    overscan: 10,
  });
  const rows = windowed
    ? virtualizer.getVirtualItems().map((item) => ({ index: item.index, start: item.start }))
    : spans.map((_, index) => ({ index, start: 0 }));
  const [focusIndex, setFocusIndex] = React.useState<number | null>(null);
  const activeIndex = activeId === undefined ? -1 : spans.findIndex((s) => s.id === activeId);
  const tabRow = focusIndex ?? Math.max(activeIndex, 0);

  // The track's width in px, so a duration label goes where it fits. Zero until measured, which falls back to fractions.
  const trackRef = React.useRef<HTMLSpanElement>(null);
  const [trackPx, setTrackPx] = React.useState(0);
  React.useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setTrackPx(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const show = (index: number) => {
    if (windowed) virtualizer.scrollToIndex(index, { align: "center" });
    else
      scrollRef.current
        ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
        ?.scrollIntoView({ block: "nearest" });
  };
  const focusRow = (index: number) => {
    const next = Math.max(0, Math.min(spans.length - 1, index));
    setFocusIndex(next);
    show(next);
    requestAnimationFrame(() =>
      scrollRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus(),
    );
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    const moves: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: spans.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      focusRow(moves[event.key]);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
      event.preventDefault();
      onSpanClick?.(spans[index]);
    }
  };
  // Gridlines at every tick, drawn behind each row's track as one repeating 1px line a tick apart.
  const step = scale.ticks.length > 1 ? scale.ticks[1] - scale.ticks[0] : span;
  const grid = { "--grid-step": `${(step / span) * 100}%` } as React.CSSProperties;
  const gridClass =
    "bg-[linear-gradient(to_right,var(--line-row)_var(--line-hair),transparent_var(--line-hair))] bg-size-[var(--grid-step)_100%]";
  // The status column only takes room when a span has trouble or waits, so the track keeps the width.
  const marked = spans.some(
    (s) => s.status === "warn" || s.status === "fail" || s.status === "waiting",
  );
  // The name keeps 40% of a narrow frame and never less than --timeline-name-min; from 576px it is 30%, to
  // --timeline-name, and the status column joins. Below that the track carries the word of a waiting span.
  const columns = cn(
    "grid grid-cols-[minmax(0,max(var(--timeline-name-min),40%))_minmax(0,1fr)] items-center",
    marked
      ? "@xl/timeline:grid-cols-[minmax(0,clamp(var(--timeline-name-min),30%,var(--timeline-name)))_minmax(0,1fr)_var(--status-column)]"
      : "@xl/timeline:grid-cols-[minmax(0,clamp(var(--timeline-name-min),30%,var(--timeline-name)))_minmax(0,1fr)]",
  );
  // A running clock moves bars every tick; easing at the clock's own pace makes it one smooth growth.
  const glide = running
    ? "transition-[inset-inline-start,inset-inline-end,width] duration-1000 ease-linear motion-reduce:transition-none"
    : "";

  const row = (index: number, top: number) => {
    const s = spans[index];
    const end = ends[index];
    const open = s.id === activeId;
    const trouble = s.status === "warn" || s.status === "fail" ? s.status : undefined;
    const isRunning = s.end === undefined && s.status !== "waiting" && s.status !== "queued";
    // The duration sits inside a bar wide enough to hold it, after a bar with room to its end, else before the bar.
    // Widths are in px: a label is about 6.5px a character, and a waiting span on a narrow track adds its status word.
    const charPx = 6.5;
    const labelPx =
      durations[index].length * charPx +
      (s.status === "waiting" ? (statusWord(s).length + 2) * charPx : 0);
    const gap = 8;
    const barPx = (frac(end) - frac(s.start)) * trackPx;
    const place: "in" | "after" | "before" =
      trackPx === 0
        ? s.status !== "waiting" && frac(end) - frac(s.start) >= 0.22
          ? "in"
          : frac(end) <= 0.84
            ? "after"
            : "before"
        : s.status !== "waiting" && barPx >= labelPx + gap * 2
          ? "in"
          : (1 - frac(end)) * trackPx >= labelPx + gap
            ? "after"
            : "before";
    // A quiet bar is grey unless it is open (the timeline's kind, run blue by default) or in trouble.
    const colored = bars === "kind" || open || !!trouble;
    const name = `${s.label}, started at ${formatDurations([s.start]).values[0]}, ${isRunning || s.status === "waiting" ? "so far" : "took"} ${durations[index]}${s.status && s.status !== "ok" ? `, ${statusWord(s).toLowerCase()}` : ""}`;
    return (
      <div
        key={s.id}
        data-index={index}
        data-slot="timeline-row"
        data-kind={s.kind}
        data-status={trouble}
        data-open={open || undefined}
        role={onSpanClick ? "option" : "listitem"}
        aria-selected={onSpanClick ? open : undefined}
        aria-label={name}
        tabIndex={onSpanClick ? (index === tabRow ? 0 : -1) : undefined}
        onFocus={onSpanClick ? () => setFocusIndex(index) : undefined}
        onKeyDown={onSpanClick ? (event) => onKeyDown(event, index) : undefined}
        onClick={onSpanClick ? () => onSpanClick(s) : undefined}
        className={cn(
          columns,
          "min-h-(--timeline-row) rule-row transition-colors duration-(--dur-fast) ease-(--ease-step)",
          // Like a table: warn keeps paper, fail takes a faint wash; the bar and the word carry the status.
          trouble === "fail" && "wash-row",
          onSpanClick && "cursor-pointer hover:bg-hover focus-visible:focus-ring-inset",
          windowed && "absolute inset-x-0 top-0 translate-y-(--row-y)",
        )}
        style={windowed ? ({ "--row-y": `${top}px` } as React.CSSProperties) : undefined}
      >
        <span
          aria-hidden
          data-slot="timeline-name"
          className="@container/name relative flex h-(--timeline-row) min-w-0 items-center gap-2 ps-[calc(var(--space-4)+var(--depth)*var(--space-4))] pe-3"
          style={{ "--depth": s.depth ?? 0 } as React.CSSProperties}
        >
          {Array.from({ length: s.depth ?? 0 }, (_, d) => (
            <span
              key={d}
              data-slot="timeline-guide"
              className="absolute inset-y-0 start-[calc(var(--space-4)+var(--guide)*var(--space-4)+var(--space-1))] w-px bg-line-row"
              style={{ "--guide": d } as React.CSSProperties}
            />
          ))}
          <span className="min-w-(--timeline-label-min) truncate type-label text-text-1">
            {s.label}
          </span>
          {s.meta != null && (
            <span className="min-w-0 shrink truncate type-tag text-text-3 @max-md/timeline:hidden">
              {s.meta}
            </span>
          )}
          {s.figure != null && (
            <span
              data-slot="timeline-figure"
              className="ms-auto shrink-0 data type-tag text-text-3 @max-md/timeline:hidden @max-[16rem]/name:hidden"
            >
              {s.figure}
            </span>
          )}
        </span>
        <span
          aria-hidden
          data-slot="timeline-track"
          className={cn("relative me-4 h-(--timeline-row)", gridClass)}
          style={
            { ...grid, "--bar-start": at(s.start), "--bar-end": at(end) } as React.CSSProperties
          }
        >
          {s.status === "waiting" ? (
            // Nothing has happened yet: a paper bar with an ink edge from the start to now. Waiting is not a warning, so no amber.
            <span
              data-slot="timeline-wait"
              className={cn(
                "absolute start-(--bar-start) top-1/2 h-4 w-[calc(var(--bar-end)-var(--bar-start))] min-w-1 -translate-y-1/2 rounded-inner bg-page control-edge [--frame-color:var(--ink)]",
                glide,
              )}
            />
          ) : (
            <span
              data-slot="timeline-bar"
              data-status={trouble}
              data-kind={bars === "quiet" && open && !trouble ? (kind ?? "run") : undefined}
              className={cn(
                "absolute start-(--bar-start) top-1/2 h-4 w-[calc(var(--bar-end)-var(--bar-start))] min-w-1 -translate-y-1/2 rounded-inner forced-colors:bg-[CanvasText]",
                colored ? "bg-accent-mark" : "bg-(--line-control-hover)",
                glide,
              )}
            />
          )}
          <span
            data-slot="timeline-duration"
            data-place={place}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 type-label-sm data whitespace-nowrap",
              place === "after"
                ? "start-[calc(var(--bar-end)+var(--space-2))]"
                : place === "in"
                  ? "end-[calc(100%-var(--bar-end)+var(--space-2))]"
                  : "end-[calc(100%-var(--bar-start)+var(--space-2))]",
              place === "in"
                ? colored
                  ? "text-on-field"
                  : "text-text-1"
                : trouble === "fail"
                  ? "text-fail-text"
                  : trouble === "warn"
                    ? "text-warn-text"
                    : "text-text-2",
              glide,
            )}
          >
            <span className={cn(s.status === "waiting" && "@max-xl/timeline:hidden")}>
              {durations[index]}
            </span>
            {s.status === "waiting" && (
              <Status status="waiting" className="type-label-sm @xl/timeline:hidden">
                {statusWord(s)}
              </Status>
            )}
          </span>
        </span>
        <span aria-hidden className="flex justify-end pe-4 empty:hidden @max-xl/timeline:hidden">
          {s.status === "waiting" ? (
            <Status status="waiting" className="type-label-sm">
              {statusWord(s)}
            </Status>
          ) : (
            trouble && (
              <Status status={trouble} className="type-label-sm">
                {statusWord(s)}
              </Status>
            )
          )}
        </span>
      </div>
    );
  };

  return (
    <section
      ref={frameRef}
      data-slot="timeline"
      data-kind={kind}
      data-status={failed ? "fail" : undefined}
      aria-label={label}
      aria-busy={loading || undefined}
      data-size={size}
      className={cn(
        "@container/timeline frame flex min-w-0 flex-col bg-page text-text-1 [--timeline-row:var(--row)] data-[size=sm]:[--timeline-row:var(--row-sm)]",
        className,
      )}
      {...props}
    >
      <header data-slot="timeline-header" className="frame-head rule-row">
        <span className="min-w-0 truncate type-label text-text-1">{label}</span>
        {!loading && spans.length > 0 && (
          <span className="shrink-0 data type-label text-text-3">{totalLabel}</span>
        )}
        <span className="frame-head-action">
          {failed ? <Status status="fail">Failed</Status> : running && <Status status="running" />}
        </span>
      </header>
      <div data-slot="timeline-inset" className="flex min-h-0 min-w-0 flex-col">
        <div aria-hidden className={cn(columns, "h-(--row-sm) shrink-0 rule-row")}>
          <span className="ps-4 type-label-sm text-text-3">Step</span>
          <span ref={trackRef} className="relative me-4 h-full">
            {scale.ticks.map((t, i) => (
              <span
                key={t}
                className={cn(
                  "absolute start-(--tick) top-1/2 -translate-y-1/2 type-label-sm data text-text-3",
                  i > 0 && "-translate-x-1/2 rtl:translate-x-1/2",
                  scale.ticks[i] / span > 0.92 && "hidden",
                )}
                style={{ "--tick": at(t) } as React.CSSProperties}
              >
                {tickLabels[i]}
              </span>
            ))}
          </span>
          <span className="@max-xl/timeline:hidden" />
        </div>
        <div className="relative min-h-0">
          <div
            ref={scrollRef}
            role={onSpanClick ? "listbox" : "list"}
            aria-label={`Steps in ${label}`}
            className="relative max-h-(--timeline-max-h) [scrollbar-width:thin] overflow-auto overscroll-contain"
            style={
              maxHeight
                ? ({ "--timeline-max-h": `${maxHeight}px` } as React.CSSProperties)
                : undefined
            }
          >
            {loading ? (
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} aria-hidden className={cn(columns, "h-(--timeline-row) rule-row")}>
                  <span className="ps-4">
                    <span className="block h-2 w-2/3 bg-(--surface-skeleton)" />
                  </span>
                  <span className="relative h-full">
                    <span
                      className="absolute start-(--skeleton-start) top-1/2 h-3 w-(--skeleton-w) -translate-y-1/2 bg-(--surface-skeleton)"
                      style={
                        {
                          "--skeleton-start": `${i * 18}%`,
                          "--skeleton-w": `${30 - i * 4}%`,
                        } as React.CSSProperties
                      }
                    />
                  </span>
                  <span className="@max-xl/timeline:hidden" />
                </div>
              ))
            ) : spans.length === 0 ? (
              <p className="px-4 py-6 type-body text-text-2">No steps yet.</p>
            ) : windowed ? (
              <div
                className="relative h-(--timeline-h)"
                style={{ "--timeline-h": `${virtualizer.getTotalSize()}px` } as React.CSSProperties}
              >
                {rows.map((r) => row(r.index, r.start))}
              </div>
            ) : (
              rows.map((r) => row(r.index, 0))
            )}
          </div>
        </div>
      </div>
      {footer != null && (
        <div data-slot="timeline-footer" className={"shrink-0 rule-top"}>
          {footer}
        </div>
      )}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Step</th>
            <th scope="col">Started at</th>
            <th scope="col">Took</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {spans.map((s, i) => (
            <tr key={s.id}>
              <th scope="row">{s.label}</th>
              <td>{formatDurations([s.start]).values[0]}</td>
              <td>{durations[i]}</td>
              <td>{statusWord(s) || statusLabels.ok}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export { Timeline, type TimelineProps, type TimelineSpan, type TimelineStatus };
