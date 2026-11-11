import { cn } from "cn";

// A marketing block that blurs in as it scrolls into view. Pure CSS (the `reveal` utility in theme.css, a scroll
// timeline), so nothing waits on JavaScript: on a slow phone the old JS reveal left the steps blank for seconds.
export function Reveal({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("reveal", className)}>{children}</div>;
}
