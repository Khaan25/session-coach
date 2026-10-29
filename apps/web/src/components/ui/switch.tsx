"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "cn";

/*
 * Quartz's switch skin: a fully rounded track with a round thumb. Off: a paper track with a 1px control edge
 * at --border-control, ink on hover, and a grey thumb at the start. On: an ink track and a paper thumb at the
 * end. The state reads from the thumb's position and the fill, never from hue. 36x20 with a 16px thumb, 28x16
 * with a 12px thumb at sm: a 2px inset all round in both sizes.
 *
 * The edge is a box-shadow (control-edge), not a border, so the thumb's inset is the track's own padding
 * and the squash maths below carries no border term.
 *
 * `pending` (a save in flight): the thumb moves the moment it is pressed, then dims and holds still until the
 * save settles. The switch stays focusable but read-only, so a second flip cannot race the first.
 */
function Switch({
  className,
  size = "default",
  pending,
  readOnly,
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
  /** The change is saving. The thumb dims and further flips are ignored until it settles. */
  pending?: boolean;
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      data-pending={pending || undefined}
      aria-busy={pending || undefined}
      readOnly={readOnly || pending}
      className={cn(
        // `--thumb`, `--track` and `--track-h` are declared here rather than on the thumb
        // because the squash geometry is all ratios of them, and a ratio written twice for
        // two sizes is a ratio that will disagree with itself. `--track` is the track's
        // width, the distance the thumb actually has.
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full outline-none [-webkit-tap-highlight-color:transparent]",
        "bg-page control-edge transition-[background-color,border-color,box-shadow] [--frame-color:var(--border-control)]",
        "touch-target not-pointer-coarse:after:absolute not-pointer-coarse:after:-inset-x-3 not-pointer-coarse:after:-inset-y-2",
        "data-[size=default]:h-5 data-[size=default]:w-9 data-[size=default]:[--thumb:--spacing(4)] data-[size=default]:[--track-h:20px] data-[size=default]:[--track:36px]",
        "data-[size=sm]:h-4 data-[size=sm]:w-7 data-[size=sm]:[--thumb:--spacing(3)] data-[size=sm]:[--track-h:16px] data-[size=sm]:[--track:28px]",
        "hover:not-data-disabled:not-data-readonly:data-unchecked:not-aria-invalid:[--frame-color:var(--ink)]",
        "data-checked:bg-ink",
        "active:not-data-disabled:not-data-readonly:data-checked:bg-button-primary-hover active:not-data-disabled:not-data-readonly:data-unchecked:bg-pressed",
        "aria-invalid:[--frame-color:var(--fail-line)]",
        "data-disabled:cursor-not-allowed data-disabled:bg-page data-disabled:[--control-lift:var(--elev-none)] data-disabled:[--frame-color:var(--text-disabled)] data-disabled:data-checked:bg-text-disabled",
        "data-pending:cursor-progress data-readonly:cursor-default",
        "forced-colors:border forced-colors:border-solid forced-colors:border-[CanvasText] forced-colors:data-checked:bg-[Highlight]! forced-colors:data-checked:[forced-color-adjust:none]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block bg-text-2 ring-0 will-change-transform group-data-pending/switch:opacity-(--stale-opacity) group-data-disabled/switch:bg-text-disabled data-checked:bg-paper group-data-disabled/switch:data-checked:bg-paper",
          /*
           * The squash is two scale factors, and everything else is derived
           * from them so the parts cannot drift apart.
           *
           * `scale` rather than width/height because those are layout
           * properties: the thumb is a flex item, so animating its box
           * invalidates layout up through the track, the row and whatever
           * card they sit in, sixty times a second. `scale` and `translate`
           * are composited and touch none of that.
           *
           * `--w` and `--h` are the sizes that scale will *render*, kept as
           * lengths because the positioning maths below needs pixels, not
           * ratios. The layout box itself never changes.
           */
          "size-(--thumb) [--h:calc(var(--thumb)*var(--sy))] [--sx:1] [--sy:1] [--w:calc(var(--thumb)*var(--sx))]",
          "origin-left scale-[var(--sx)_var(--sy)] rtl:origin-right",
          /*
           * Two steps: hover widens, press widens further and flattens.
           * Tailwind v4's `hover` carries `@media (hover: hover)`, so touch
           * does not get a widened thumb stuck on after tapping.
           */
          "group-hover/switch:[--sx:1.125]",
          "group-active/switch:[--sx:1.25] group-active/switch:[--sy:0.75]",
          /*
           * The same two steps again, driven by the surrounding `Field`
           * instead of the control - so a settings row answers anywhere
           * along its width rather than only over the switch itself.
           *
           * The explicit `@media (hover: hover)` is doing real work: Tailwind
           * attaches that automatically to its own `hover` variant, but this
           * is an arbitrary selector, so without it a tap would leave the row
           * hovered and the thumb stuck wide until the next tap elsewhere.
           * `:active` needs no such guard - it cannot outlive the press.
           */
          "[@media(hover:hover)]:in-[[data-slot=field]:hover]:[--sx:1.125]",
          "in-[[data-slot=field]:active]:[--sx:1.25] in-[[data-slot=field]:active]:[--sy:0.75]",
          /*
           * The radius has to be un-scaled, or the squash is a balloon
           * rather than a lozenge: `scale` stretches the corners along with
           * the box, so a circle pressed to 125% paints an oval with
           * drawn-out ends.
           *
           * Authored horizontal is `(thumb / 2) * sy / sx`, which is
           * whatever value comes back out as a semicircle of the *rendered*
           * height once both factors have been applied. One expression for
           * every state, including rest, where the factors are 1 and it
           * reduces to half the thumb - a plain circle.
           */
          "rounded-[calc(var(--thumb)/2*var(--sy)/var(--sx))/calc(var(--thumb)/2)]",
          /*
           * `--gap` is what keeps the squashed thumb looking inset rather
           * than jammed against the end.
           *
           * The flex row re-centres the thumb vertically the instant it
           * flattens, so its top and bottom gaps grow, while the end it sits
           * against would stay put. The result reads as off-centre even
           * though it is centred on one axis. So the horizontal inset is
           * derived from the same arithmetic the vertical one gets for free:
           * half the leftover height. At rest that is the 2px inset, so
           * nothing moves until something squashes.
           *
           * Travel is measured rather than a percentage of the thumb:
           * `translate-x: 100%` is a share of the thumb's own width, so the
           * moment that width changes the checked thumb would walk past the
           * end of the track.
           */
          "[--gap:calc((var(--track-h)-var(--h))/2)]",
          "data-checked:translate-x-[calc(var(--track)-var(--w)-var(--gap))] rtl:data-checked:-translate-x-[calc(var(--track)-var(--w)-var(--gap))] data-unchecked:translate-x-(--gap) rtl:data-unchecked:-translate-x-(--gap)",
          // A disabled or pending switch still receives hover, and `!` is what keeps
          // this ahead of both states without relying on utility order.
          "group-data-pending/switch:[--sx:1]! group-data-pending/switch:[--sy:1]! group-data-readonly/switch:[--sx:1]! group-data-readonly/switch:[--sy:1]! group-data-disabled/switch:[--sx:1]! group-data-disabled/switch:[--sy:1]!",
          /*
           * One duration, one curve, no per-property delay - and that is a
           * correctness constraint here, not a preference.
           *
           * `translate` and `scale` are not two effects, they are one:
           * growing the thumb while pinning the edge it already occupies
           * means moving it back by exactly what it gains. On the checked
           * side hover shifts `translate` left by the same amount that
           * `scale` adds to the right, and the two cancel to "the far edge
           * stays put, the near edge extends". Give either one a different
           * duration or a delay and the cancellation stops being exact:
           * `scale` delayed by 60ms means the thumb slides bodily left for
           * 60ms and only then grows, which reads as a lurch. The unchecked
           * side never showed it because its `translate` is constant either
           * way, so there was nothing to fall out of step with.
           */
          "transition-[translate,scale,border-radius] duration-150 ease-out-quint",
          // Squash is decoration, so it goes; the travel still needs to
          // read as movement between two positions, so it stays.
          "motion-reduce:transition-[translate] motion-reduce:[--sx:1]! motion-reduce:[--sy:1]!",
          "forced-colors:bg-[CanvasText] forced-colors:[forced-color-adjust:none] forced-colors:data-checked:bg-[HighlightText]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
