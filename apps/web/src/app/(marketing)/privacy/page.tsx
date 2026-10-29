import type { Metadata } from "next";
import { allLegals } from "content-collections";

import { LegalPage } from "@/components/marketing/legal-page";

// content/legal/privacy.md; the collection schema guarantees the fields, the find guarantees the file.
const document = allLegals.find((legal) => legal.slug === "privacy")!;

export const metadata: Metadata = {
  title: `${document.title} | Session Coach`,
  description: document.description,
};

export default function Page() {
  return <LegalPage document={document} />;
}
