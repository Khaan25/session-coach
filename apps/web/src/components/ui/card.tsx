import { cn } from "cn";
import * as React from "react";

// The design system's card is the frame: paper, one 1px grey edge, the 10px frame corner. Inside it only row rules: a 40px
// header over a rule, the body, a footer under a rule. Never a Card inside a Card; a well inside it (code, output)
// is grey on its own. The edge darkens on hover with the zip's short shadow transition.
// Size sets --card-spacing (12, 16, 24px), which pads the header, body and footer alike, and lg also
// takes a heading-size title, so the three sizes read as different densities, not one card.

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" | "lg" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card frame relative flex flex-col overflow-hidden bg-page type-body text-text-1",
        // The hover edge recolours the frame's own line (drawn above the content), so a child's
        // background cannot cover it; same 150ms ease-out as the zip's shadow version.
        "before:transition-[border-color] before:duration-150 before:ease-out hover:[--frame-color:var(--line-control-hover)] [a]:hover:bg-hover",
        // A card holding a list becomes a panel: grey, header on the grey, the list inset in white.
        "has-[>[data-slot=item-group]]:bg-(--surface-frame) has-[>[data-slot=item-group]]:*:data-[slot=card-header]:shadow-none",
        "[--card-spacing:var(--space-4)] data-[size=lg]:[--card-spacing:var(--space-6)] data-[size=sm]:[--card-spacing:var(--space-3)]",
        "*:[img:first-child]:rounded-t-frame *:[img:last-child]:rounded-b-frame",
        "forced-colors:outline forced-colors:outline-1",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // The shared 40px header over a row rule. With a description it grows to two lines on a grid, the action
        // spanning both; with none it is one line, the action at the end.
        "group/card-header @container/card-header frame-head rule-row *:data-[slot=card-action]:ms-auto",
        // frame-head pads 16px inline; a sized card pads by its own spacing.
        "px-(--card-spacing)! group-data-[size=lg]/card:min-h-(--row-lg) group-data-[size=lg]/card:py-4 group-data-[size=sm]/card:min-h-(--row-sm) group-data-[size=sm]/card:py-2",
        "has-data-[slot=card-description]:grid has-data-[slot=card-description]:auto-rows-min has-data-[slot=card-description]:grid-rows-[auto_auto] has-data-[slot=card-description]:content-center has-data-[slot=card-description]:gap-y-0.5 has-data-[slot=card-description]:py-2.5 has-data-[slot=card-action]:has-data-[slot=card-description]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "min-w-0 type-label text-balance text-text-1 group-data-[size=lg]/card:type-heading-xs",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("type-body-sm text-pretty text-text-2", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 frame-head-action self-center justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("flex flex-col gap-3 p-(--card-spacing) type-body", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "mt-auto frame-foot px-(--card-spacing)! rule-top group-data-[size=lg]/card:min-h-(--row-lg) group-data-[size=lg]/card:py-3 group-data-[size=sm]/card:min-h-(--row) group-data-[size=sm]/card:py-1",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
