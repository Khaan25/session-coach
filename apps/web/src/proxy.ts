import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next 16's request hook (the old middleware). Runs before every matched page and route, so the learner's session is
 * refreshed in exactly one place and signed-out visitors never reach an app page.
 *
 * @param request - The incoming request.
 * @returns The response from `updateSession`: a pass-through carrying refreshed cookies, or a redirect.
 */
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except Next's assets, the Play Stats API (bearer key, no session) and files with an extension.
    "/((?!_next/static|_next/image|api/dashboard|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
