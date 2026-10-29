import { cn } from "cn";
import * as React from "react";

// Quartz's card is the frame: paper, one 1px grey edge, the 10px frame corner. Inside it only row rules: a 40px
// header over a rule, the body, a footer under a rule. Never a Card inside a Card; a well inside it (code, output)
// is grey on its own. The edge darkens on hover with the zip's short shadow transition.
// --card-spacing pads the body only; the header and footer keep the frame's 16px inline padding.

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
        "shadow-[inset_0_0_0_1px_transparent] transition-shadow duration-150 ease-out hover:shadow-[inset_0_0_0_1px_var(--line-control-hover)] [a]:hover:bg-hover",
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
      className={cn("min-w-0 type-label text-balance text-text-1", className)}
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
    <div data-slot="card-footer" className={cn("frame-foot rule-top", className)} {...props} />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
