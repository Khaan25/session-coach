import type { Legal } from "content-collections";

import { MarketingPage } from "@/components/marketing/marketing-page-header";
import { Badge } from "@/components/ui/badge";
import { Prose } from "@/components/ui/prose";

const updatedFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

/** A legal page from content/legal: title, last change, the draft notice, then the Markdown. */
export function LegalPage({ document }: { document: Legal }) {
  return (
    <MarketingPage
      title={document.title}
      lead={
        <>
          Last updated{" "}
          <time dateTime={document.updated}>
            {updatedFormat.format(new Date(document.updated))}
          </time>
        </>
      }
    >
      <article className="flex flex-col gap-8">
        {document.draft && (
          <p className="flex flex-wrap items-center gap-2 type-body text-text-2">
            <Badge variant="warning">Draft</Badge>
            Not legal advice. This page is a draft until a person reviews it.
          </p>
        )}
        {/* The HTML is compiled at build time from our own Markdown in content/legal, not user input. */}
        <Prose dangerouslySetInnerHTML={{ __html: document.html }} />
      </article>
    </MarketingPage>
  );
}
