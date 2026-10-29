import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";

export type FaqEntry = { question: string; answer: string };

/** Questions as disclosures. Closed answers stay in the page (hidden="until-found"), so find-in-page and crawlers see them. */
export function Faq({ entries }: { entries: readonly FaqEntry[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line-row">
      {entries.map(({ question, answer }) => (
        <li key={question} className="py-2">
          <Collapsible>
            <h3>
              <CollapsibleRow size="row">{question}</CollapsibleRow>
            </h3>
            <CollapsibleContent hiddenUntilFound>
              <p className="max-w-2xl px-3 pt-1 pb-3 type-body text-text-2">{answer}</p>
            </CollapsibleContent>
          </Collapsible>
        </li>
      ))}
    </ul>
  );
}
