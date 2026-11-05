"use client";

// The picked public pages, /how-it-works B and /pricing C: the route components themselves. They read no data, so the
// canvas renders them as they are, inside the real marketing header and footer.

import HowItWorksPage from "@/app/(marketing)/how-it-works/page";
import PricingPage from "@/app/(marketing)/pricing/page";

import { PublicFrame } from "../frames";

export function MarketingHowItWorksOptionB() {
  return (
    <PublicFrame path="/how-it-works">
      <HowItWorksPage />
    </PublicFrame>
  );
}

export function MarketingPricingOptionC() {
  return (
    <PublicFrame path="/pricing">
      <PricingPage />
    </PublicFrame>
  );
}
