"use client";

import * as React from "react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import type { Kind } from "@/lib/quartz/kind";
import { controlHeight } from "@/lib/quartz/utils";

// Quartz's segmented control: two to five views of the same thing. It also does the job of a toggle group.
// - single (default): one selected at a time. A radio group underneath (Base UI RadioGroup), so arrow
//   keys move and select and Tab leaves. Without value or defaultValue nothing is selected until the
//   first press, and a radio cannot be cleared back to none, so callers always pass one.
// - multiple: any number pressed, including none, on Base UI ToggleGroup with
//   aria-pressed. For filters such as "errors" and "warnings" shown together.
// The track is the grey well; the selected segment is a lighter box lifted off it. The selection cuts: no pill slides.
//
// Each segment can carry a `count` of what its view holds, in tabular figures after the label, so the
// person knows "Errors 12" before switching. The count's slot is reserved for its widest expected value
// (`countMax`, on the control or one segment): that value sits invisible in the same grid cell, so a
// live count that goes from 99 to 100 moves nothing. Without countMax the slot keeps the widest count it
// has shown, so it never shrinks back and jitters. The count is aria-hidden and reaches the radio as its
// description, so the name stays "Errors" while the number ticks.
//
// A label longer than its segment truncates inside its own box with a fade at the end (no glyph is cut
// at a hard edge), and the segment gets the full label as its title. A segment never shrinks below about
// 6 characters of label, so a long label stays readable; when the segments together are wider than the
// box, the control overflows it instead of crushing a label (it cannot scroll: Base UI's roving focus
// scrolls the highlighted segment into view on mount, which would shift the track).

// A grey track with 2px of padding; each segment is a 4px-cornered box inside it, and the selected one takes --surface-thumb
// (paper in light, a lighter grey with a 1px ring in dark), lifted with --elev-thumb. Segments are equal-weight, so the control balances
// whichever one is chosen.
const segmentedVariants = cva(
  [
    "inline-flex w-fit max-w-full items-stretch gap-0.5 rounded-soft bg-well p-0.5 forced-colors:border forced-colors:border-solid forced-colors:border-[CanvasText]",
  ],
  {
    variants: {
      size: {
        xs: controlHeight.xs,
        sm: controlHeight.sm,
        default: controlHeight.default,
      },
      fill: {
        true: "flex w-full *:flex-1",
        false: "",
      },
    },
    defaultVariants: { size: "default", fill: false },
  },
);

type Mode = { size: "xs" | "sm" | "default"; multiple: boolean; countMax?: number };
const ModeContext = React.createContext<Mode>({ size: "default", multiple: false });

type Common = VariantProps<typeof segmentedVariants> & {
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  /** Names the control for assistive tech when no visible label points at it. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** The widest count any segment is expected to show. Its width is reserved, so counts never move the segments. */
  countMax?: number;
};

type SingleProps = Common &
  Omit<
    RadioGroupPrimitive.Props,
    "value" | "defaultValue" | "onValueChange" | "className" | "children"
  > & {
    multiple?: false;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
  };

type MultipleProps = Common &
  Omit<
    ToggleGroupPrimitive.Props,
    "value" | "defaultValue" | "onValueChange" | "className" | "children" | "multiple"
  > & {
    /** Any number of segments pressed, including none. */
    multiple: true;
    value?: string[];
    defaultValue?: string[];
    onValueChange?: (value: string[]) => void;
  };

type SegmentedControlProps = SingleProps | MultipleProps;

function SegmentedControl(props: SegmentedControlProps) {
  const { className, size = "default", fill = false, children } = props;
  const classes = cn(segmentedVariants({ size, fill }), className);
  const ctx = { size: size ?? "default", multiple: !!props.multiple, countMax: props.countMax };
  if (props.multiple) {
    const {
      multiple: _m,
      onValueChange,
      size: _s,
      fill: _f,
      className: _c,
      children: _ch,
      countMax: _cm,
      ...rest
    } = props;
    return (
      <ToggleGroupPrimitive
        data-slot="segmented-control"
        data-size={size}
        data-multiple=""
        multiple
        onValueChange={(value) => onValueChange?.(value as string[])}
        className={classes}
        {...rest}
      >
        <ModeContext.Provider value={ctx}>{children}</ModeContext.Provider>
      </ToggleGroupPrimitive>
    );
  }
  const {
    multiple: _m,
    onValueChange,
    size: _s,
    fill: _f,
    className: _c,
    children: _ch,
    countMax: _cm,
    ...rest
  } = props;
  return (
    <RadioGroupPrimitive
      data-slot="segmented-control"
      data-size={size}
      onValueChange={(value) => onValueChange?.(value as string)}
      className={classes}
      {...rest}
    >
      <ModeContext.Provider value={ctx}>{children}</ModeContext.Provider>
    </RadioGroupPrimitive>
  );
}

type SegmentedControlItemProps = {
  value: string;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** How many things the segment's view holds. Tabular figures, after the label. */
  count?: number;
  /** The widest count this segment is expected to show; overrides the control's countMax. */
  countMax?: number;
  /** Sets data-kind on the segment. The selected thumb stays paper whatever the kind: hue never fills a segment. */
  kind?: Kind;
  "aria-label"?: string;
};

const fmt = new Intl.NumberFormat("en-US");

/**
 * Sets data-overflow while the label is wider than its box, so the fade and the title only show then.
 * The measure runs again when the box resizes, when the label's text changes, and when a web font
 * finishes loading: a label measured in a wider fallback face would otherwise keep a fade it no longer
 * needs, because a squeezed box does not change size when the narrower face arrives.
 */
function useOverflow<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [over, setOver] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOver(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, characterData: true, subtree: true });
    const fonts = el.ownerDocument.fonts;
    fonts?.addEventListener("loadingdone", check);
    fonts?.ready.then(check);
    return () => {
      ro.disconnect();
      mo.disconnect();
      fonts?.removeEventListener("loadingdone", check);
    };
  }, []);
  return [ref, over] as const;
}

function SegmentedControlItem({
  className,
  children,
  count,
  countMax: itemMax,
  kind,
  ...props
}: SegmentedControlItemProps) {
  const { size, multiple, countMax: groupMax } = React.useContext(ModeContext);
  const countId = React.useId();
  const [labelRef, over] = useOverflow<HTMLSpanElement>();
  // Without countMax, the slot keeps the widest count it has shown, so it never shrinks back.
  const [seen, setSeen] = React.useState(0);
  if (count !== undefined && count > seen) setSeen(count);
  const reserve = itemMax ?? groupMax ?? Math.max(seen, count ?? 0);
  const title = over && typeof children === "string" ? children : undefined;
  const classes = cn(
    "touch-target relative inline-flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-inner whitespace-nowrap select-none [-webkit-tap-highlight-color:transparent]",
    "min-w-(--segment-min) shrink-(--segment-shrink)",
    "text-text-2 transition-[background-color,color,outline-color] duration-(--dur-fast) ease-(--ease-step)",
    size === "xs" ? "px-2 type-label-sm" : "px-3 type-label",
    "hover:not-data-disabled:not-data-checked:not-data-pressed:text-text-1 active:not-data-disabled:not-data-checked:not-data-pressed:bg-hover",
    // The choice is a lifted box on the grey track, whatever the kind: hue never fills a segment.
    "data-pressed:bg-(--surface-thumb) data-pressed:text-text-1 data-pressed:shadow-(--elev-thumb) data-checked:bg-(--surface-thumb) data-checked:text-text-1 data-checked:shadow-(--elev-thumb)",
    "focus-visible:focus-ring-inset",
    "data-disabled:cursor-not-allowed data-disabled:text-text-disabled data-disabled:data-pressed:bg-pressed data-disabled:data-pressed:text-text-disabled data-disabled:data-checked:bg-pressed data-disabled:data-checked:text-text-disabled",
    "forced-colors:data-checked:bg-[Highlight]! forced-colors:data-checked:text-[HighlightText]! forced-colors:data-checked:[forced-color-adjust:none]",
    "forced-colors:data-pressed:bg-[Highlight]! forced-colors:data-pressed:text-[HighlightText]! forced-colors:data-pressed:[forced-color-adjust:none]",
    "forced-colors:data-disabled:text-[GrayText] forced-colors:data-disabled:data-pressed:bg-[Canvas]! forced-colors:data-disabled:data-pressed:text-[GrayText]! forced-colors:data-disabled:data-checked:bg-[Canvas]! forced-colors:data-disabled:data-checked:text-[GrayText]!",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    className,
  );
  const content = (
    <>
      <span
        ref={labelRef}
        data-slot="segmented-control-label"
        data-overflow={over || undefined}
        className="inline-flex min-w-0 items-center gap-1.5 overflow-hidden data-overflow:[mask-image:linear-gradient(to_right,var(--ink)_calc(100%-var(--fade-line-end)),transparent)] rtl:data-overflow:[mask-image:linear-gradient(to_left,var(--ink)_calc(100%-var(--fade-line-end)),transparent)]"
      >
        {children}
      </span>
      {count !== undefined && (
        <span
          data-slot="segmented-control-count"
          aria-hidden
          className="grid shrink-0 justify-items-end tabular-nums [grid-template-areas:'c']"
        >
          <span className="invisible [grid-area:c]">{fmt.format(Math.max(reserve, count))}</span>
          <span id={countId} className="[grid-area:c]">
            {fmt.format(count)}
          </span>
        </span>
      )}
    </>
  );
  // Flex shrinks each segment by its shrink factor times its width. Weighting by the label length cubed
  // as well puts nearly all of a squeeze on the longest label, so it fades before a short one loses a glyph.
  const shrink = typeof children === "string" ? Math.max(1, children.length ** 3) : 1;
  // A floor under the squeeze: a segment never gets narrower than about 6 characters of its label (less
  // for a short one) plus its padding and count, so a long label stays readable instead of being
  // crushed to one letter.
  const floorCh = typeof children === "string" ? Math.min(children.length * 0.8, 6) : 0;
  const countCh = count !== undefined ? fmt.format(Math.max(reserve, count)).length : 0;
  const minWidth = `calc(${floorCh + countCh}ch + ${(size === "xs" ? 16 : 24) + (count !== undefined ? 6 : 0)}px)`;
  const shared = {
    "data-slot": "segmented-control-item",
    "data-kind": kind,
    "aria-describedby": count !== undefined ? countId : undefined,
    title,
    style: { "--segment-shrink": shrink, "--segment-min": minWidth } as React.CSSProperties,
    className: classes,
  };
  if (multiple)
    return (
      <TogglePrimitive {...shared} {...props}>
        {content}
      </TogglePrimitive>
    );
  return (
    <RadioPrimitive.Root {...shared} {...props}>
      {content}
    </RadioPrimitive.Root>
  );
}

export {
  SegmentedControl,
  SegmentedControlItem,
  segmentedVariants,
  type SegmentedControlProps,
  type SegmentedControlItemProps,
};
