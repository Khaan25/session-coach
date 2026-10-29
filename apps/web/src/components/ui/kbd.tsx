import { cn } from "cn";

// Quartz's key cap: 20px tall, at least 20px wide, on the inner corner, in type-tag. Paper with a 1px control edge,
// so it reads as a key and not as a smaller grey chip. Inside a tooltip (an inverse surface) the channels have
// already flipped, so paper and the edge work as is and only the text steps up to text-1.
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        // A long name wraps inside the cap (grows taller) instead of being cut or spilling out of it.
        "frame pointer-events-none inline-flex min-h-(--tag) w-fit max-w-full min-w-(--tag) items-center justify-center gap-1 bg-page px-1 text-center type-tag [overflow-wrap:anywhere] text-text-2 select-none [--frame-color:var(--line-control)] [--frame-radius:var(--radius-inner)]",
        "in-data-[slot=sidebar-tooltip]:text-text-1 in-data-[slot=tooltip-content]:text-text-1",
        "forced-colors:outline forced-colors:outline-1 forced-colors:-outline-offset-1",
        "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-1 font-[inherit]",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
