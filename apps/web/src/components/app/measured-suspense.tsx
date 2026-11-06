import { Suspense, ViewTransition } from "react";
import { Skeleton } from "skullet/react";

/**
 * Suspense whose fallback is skullet's skeleton, measured from `skeleton`: the real view rendered from sample data.
 * Not skullet's SkeletonSuspense: that keeps a copy of the loaded content in localStorage, saved again on every
 * change, and 0.0.3 masks only ASCII letters and digits, so a learner's non-ASCII text (and after grading, the model
 * answer) would be stored readable. A `loading` Skeleton only draws; the real content never passes through skullet.
 */
export function MeasuredSuspense({
  label,
  skeleton,
  children,
}: {
  /** Read to screen readers while loading. */
  label: string;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  // The skeleton fades out and the content fades in on the route recipe (theme.css); "none" keeps both still in
  // unrelated transitions.
  return (
    <Suspense fallback={<MeasuredSkeleton label={label}>{skeleton}</MeasuredSkeleton>}>
      <ViewTransition enter="route-fade" default="none">
        {children}
      </ViewTransition>
    </Suspense>
  );
}

/** The fallback alone: what a page shows while it loads. /canvas draws it to show a page's loading state. */
export function MeasuredSkeleton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <ViewTransition exit="route-fade" default="none">
      <Skeleton loading label={label}>
        {children}
      </Skeleton>
    </ViewTransition>
  );
}
