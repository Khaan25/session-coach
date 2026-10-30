import type { Legal } from "content-collections";

import { Badge } from "@/components/ui/badge";
import { Prose } from "@/components/ui/prose";

const updatedFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

/** A legal page from content/legal: title, last change, the draft notice, then the Markdown. */
export function LegalPage({ document }: { document: Legal }) {
  return (
    <article className="mx-auto flex w-full max-w-(--container) flex-col gap-8 px-(--gutter-sm) py-16 sm:px-(--gutter)">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-none text-text-1 sm:text-6xl">
          {document.title}
        </h1>
        <p className="type-body text-text-2">
          Last updated{" "}
          <time dateTime={document.updated}>
            {updatedFormat.format(new Date(document.updated))}
          </time>
        </p>
        {document.draft && (
          <p className="flex flex-wrap items-center gap-2 type-body text-text-2">
            <Badge variant="warning">Draft</Badge>
            Not legal advice. This page is a draft until a person reviews it.
          </p>
        )}
      </header>
      {/* The HTML is compiled at build time from our own Markdown in content/legal, not user input. */}
      <Prose dangerouslySetInnerHTML={{ __html: document.html }} />
    </article>
  );
}
