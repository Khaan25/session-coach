import { OwnershipLanding } from "@/components/marketing/ownership-landing";
import { siteUrl } from "@/lib/site";
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(LESS_THAN, "\\u003c") }}
      />
      <OwnershipLanding />
    </>
  );
}
