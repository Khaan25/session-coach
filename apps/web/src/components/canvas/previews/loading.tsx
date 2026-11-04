import { StatRow } from "@/components/app/stat-row";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Item, ItemContent, ItemGroup } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";

// Loaders for the synthetic previews only: the real pages stream through MeasuredSuspense. Skeletons in the geometry
// of the real thing; the blocks are aria-hidden and each loader says once, in a status region, what is loading.

function Loading({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      {/* Outside the busy subtree: a screen reader may hold back what changes inside it until busy clears. */}
      <output className="sr-only">{label}</output>
      <div aria-busy="true" className="contents">
        {children}
      </div>
    </div>
  );
}

/** The dashboard's session list: SessionRow's title, repo, time and status word. At most 8 rows. */
export function SessionListLoading({ rows = 4 }: { rows?: number }) {
  return (
    <Loading label="Loading sessions">
      <ItemGroup aria-hidden>
        {Array.from({ length: Math.min(rows, 8) }, (_, row) => (
          <Item key={row}>
            <ItemContent>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
            </ItemContent>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </Item>
        ))}
      </ItemGroup>
    </Loading>
  );
}

/** One decision card on /s/[id]: header, decision, why, an evidence quote, the question. */
export function DecisionCardLoading() {
  return (
    <Loading label="Loading decision cards">
      <Card size="lg" aria-hidden>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-4 w-2/3" />
        </CardFooter>
      </Card>
    </Loading>
  );
}

/** The dashboard's stats strip, holding each value's box. */
export function StatRowLoading() {
  return (
    <Loading label="Loading your stats">
      <StatRow loading />
    </Loading>
  );
}

/** The quiz on /review/[cardId]: decision, question, the answer box and the submit button. */
export function ReviewCardLoading() {
  return (
    <Loading label="Loading the card">
      <Card size="lg" aria-hidden>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-(--control) w-32" />
        </CardFooter>
      </Card>
    </Loading>
  );
}
