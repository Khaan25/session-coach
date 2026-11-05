"use client";

// The picked public pages, /how-it-works B and /pricing C: the route components themselves, rendered on the server by
// app/canvas/page.tsx (see ServerScreens), inside the real marketing header and footer.

import { PublicFrame } from "../frames";
import { useServerScreen } from "../server-screens";

export function MarketingHowItWorksOptionB() {
  return <PublicFrame path="/how-it-works">{useServerScreen("howItWorks")}</PublicFrame>;
}

export function MarketingPricingOptionC() {
  return <PublicFrame path="/pricing">{useServerScreen("pricing")}</PublicFrame>;
}
