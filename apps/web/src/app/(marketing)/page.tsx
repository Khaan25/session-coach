import {
  ClosingSection,
  Hero,
  BentoSection,
  TrustSection,
} from "@/components/marketing/landing-sections";
import { siteUrl } from "@/lib/site";

// The landing page follows docs/design/serveros-redesign.md: a centred hero over the real dashboard, then a bento grid,
// the trust band and the install command. The hero's text is there on first paint (no entrance, no LCP delay); the sections blur in on scroll.
// Structured data for search results: what the product is, that it's free during the trial, and who makes it.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Session Coach",
  url: siteUrl,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Session Coach tracks the decisions your Claude Code agent makes, project by project. Explain each one in your own words on day 1, 4 and 11 until you own it, and defend it whenever you like.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const LESS_THAN = /</g;

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static data built above, so there's nothing user-supplied to escape; < is escaped anyway.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(LESS_THAN, "\\u003c") }}
      />
      <Hero />
      <BentoSection />
      <TrustSection />
      <ClosingSection />
    </>
  );
}
