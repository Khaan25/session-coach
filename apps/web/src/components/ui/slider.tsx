"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { useRef } from "react";
import { cn } from "cn";

import { useDomDirection } from "@/lib/quartz/direction";

// Quartz's slider: a 4px track in the row rule, an ink range, and a soft-cornered ink thumb (16px) with a paper
// ring so it reads where it overlaps the range. Hover and drag step the thumb to the primary hover ink and grow
// a soft ring around it. Focus lands on the thumb's hidden input, so the thumb draws the outline with
// has-focus-visible. Direction comes from the page, so the range fills from the right under dir="rtl".
//
// The thumb is the focusable control, so the name has to land there, not on the
// root. Single-thumb sliders inherit the root's `aria-label`; ranges need `thumbLabels`.
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabels,
  "aria-label": ariaLabel,
  ...props
}: SliderPrimitive.Root.Props & {
  /** Accessible name per thumb, by index. Required for range sliders. */
  thumbLabels?: string[];
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const dir = useDomDirection(box);
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max];

  const thumbLabelAt = (index: number) =>
    thumbLabels?.[index] ?? (_values.length === 1 ? ariaLabel : undefined);

  return (
    <DirectionProvider direction={dir}>
      <SliderPrimitive.Root
        ref={box}
        className={cn("data-horizontal:w-full data-vertical:h-full", className)}
        data-slot="slider"
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        thumbAlignment="edge"
        aria-label={ariaLabel}
        {...props}
      >
        <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:cursor-not-allowed data-horizontal:h-6 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-6 data-vertical:flex-col">
          <SliderPrimitive.Track
            data-slot="slider-track"
            className="relative grow rounded-soft bg-line-row select-none forced-colors:border forced-colors:border-solid forced-colors:border-[CanvasText] data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
          >
            <SliderPrimitive.Indicator
              data-slot="slider-range"
              className="rounded-soft bg-ink select-none forced-colors:bg-[Highlight] forced-colors:[forced-color-adjust:none] data-disabled:bg-text-disabled data-horizontal:h-full data-vertical:w-full"
            />
            {Array.from({ length: _values.length }, (_, index) => {
              const thumbLabel = thumbLabelAt(index);
              return (
                <SliderPrimitive.Thumb
                  data-slot="slider-thumb"
                  key={index}
                  index={index}
                  getAriaLabel={thumbLabel ? () => thumbLabel : undefined}
                  className={cn(
                    "relative block size-4 shrink-0 cursor-grab rounded-soft bg-ink shadow-(--ring-thumb) ring-ring/30 select-none [-webkit-tap-highlight-color:transparent] after:absolute after:-inset-2",
                    "transition-[color,background-color,box-shadow]",
                    "hover:ring-2 hover:not-data-disabled:bg-button-primary-hover active:ring-2 data-dragging:cursor-grabbing data-dragging:bg-button-primary-hover",
                    "has-focus-visible:focus-ring",
                    // Disabled: the opaque grey fill with a faint edge inside the paper ring, so it still reads where there is no range behind it.
                    "disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:bg-(--surface-disabled) data-disabled:shadow-[inset_0_0_0_1px_var(--text-disabled),var(--ring-thumb)] data-disabled:ring-0",
                    "forced-colors:bg-[CanvasText] forced-colors:shadow-[0_0_0_--spacing(0.5)_Canvas] forced-colors:[forced-color-adjust:none] forced-colors:data-disabled:bg-[GrayText]",
                  )}
                />
              );
            })}
          </SliderPrimitive.Track>
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    </DirectionProvider>
  );
}

export { Slider };
