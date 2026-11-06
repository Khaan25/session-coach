import { cn } from "cn";

/** The app page frame: the container width, the page gutters and the gap between a page's blocks. */
export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="container"
      className={cn("app-container mx-auto flex w-full max-w-(--container) flex-col", className)}
      {...props}
    />
  );
}
