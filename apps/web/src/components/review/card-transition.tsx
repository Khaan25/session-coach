import { ViewTransition } from "react";

// Links into a card carry transitionTypes={["forward"]} and "Back to the queue" carries ["back"] (see theme.css for the
// recipes). Any other navigation into or out of review crossfades; browser back carries no type, so it does too.
const slides = { forward: "slide-forward", back: "slide-back", default: "route-fade" };

/** Wraps /review's and each card's page content, so moving along the queue slides instead of swapping. */
export function CardTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition default="none" enter={slides} exit={slides}>
      {children}
    </ViewTransition>
  );
}
