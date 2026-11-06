import { QuotesIcon } from "@phosphor-icons/react/ssr";
import type { Evidence } from "@session-coach/shared/decision";
import { Collapsible, CollapsibleRow, CollapsibleContent } from "@/components/ui/collapsible";
function Quote({ item }: { item: Evidence }) {
  return (
    <figure className="learning-proof">
      <QuotesIcon className="evidence-quote-mark" aria-hidden />
      <blockquote>{item.quote}</blockquote>
      <figcaption>
        {item.verified
          ? "Quote matched to your session"
          : "This quote could not be matched to your session"}
        {item.file ? ` · ${item.file}` : ""}
      </figcaption>
    </figure>
  );
}
export function SessionEvidence({
  evidence,
  variant = "disclosure",
}: {
  evidence: Evidence[];
  variant?: "summary" | "disclosure";
}) {
  if (!evidence.length) return null;
  return (
    <section className="learning-evidence">
      {variant === "summary" && (
        <>
          <h2>From your session</h2>
          <Quote item={evidence[0]!} />
        </>
      )}
      {(variant === "disclosure" || evidence.length > 1) && (
        <Collapsible>
          <CollapsibleRow>
            {variant === "summary" ? "More proof from the session" : "Proof from the session"}
          </CollapsibleRow>
          <CollapsibleContent>
            {(variant === "summary" ? evidence.slice(1) : evidence).map((item, i) => (
              <Quote key={i} item={item} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </section>
  );
}
