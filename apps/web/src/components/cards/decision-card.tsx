import { ProjectLink as Link } from "@/components/projects/project-link";
import { buttonVariants } from "@/components/ui/button";
import { Collapsible, CollapsibleRow, CollapsibleContent } from "@/components/ui/collapsible";
import { SessionEvidence } from "./session-evidence";
import type { CardHead, CardView } from "@/lib/cards/columns";
export function DecisionCard({ card }: { card: CardView }) {
  return (
    <section className="learning-decision">
      <h2>{card.decision}</h2>
      <p>{card.why}</p>
      {card.source !== "stated" && (
        <p className="learning-footnote">This reason was inferred from the work in your session.</p>
      )}
      <SessionEvidence evidence={card.evidence} />
      {card.files.length > 0 && (
        <Collapsible>
          <CollapsibleRow>Files involved</CollapsibleRow>
          <CollapsibleContent>
            <ul>
              {card.files.map((file) => (
                <li key={file}>
                  <code>{file}</code>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
      <Link href={`/review/${card.id}`} className={buttonVariants({ variant: "quiet" })}>
        Practice this decision →
      </Link>
    </section>
  );
}
export function LockedDecisionCard({ card }: { card: CardHead }) {
  return (
    <section className="learning-decision">
      <h2>{card.decision}</h2>
      <p>{card.question}</p>
      <Link href={`/review/${card.id}`} className={buttonVariants({ variant: "quiet" })}>
        Explain it in your own words →
      </Link>
    </section>
  );
}
