import { cn } from "cn";

// Holds the shape of content while it loads. The design system's still block (the skeleton surface on the soft corner)
// with the zip's pulse. Give it the size classes of the real thing (size-8, h-(--control) w-24).
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "relative shrink-0 animate-pulse overflow-hidden rounded-soft bg-(--surface-skeleton) motion-reduce:animate-none forced-colors:bg-[GrayText]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
