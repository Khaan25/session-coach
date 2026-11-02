/**
 * /api/unsubscribe?u=<user id>&t=<token>: one-click unsubscribe from the daily review email (RFC 8058), no login.
 * The daily email links here and sends it as `List-Unsubscribe`; `t` is `unsubscribeToken(u)` (lib/email/unsubscribe.ts).
 *   GET: a confirmation page with an Unsubscribe button. It changes nothing, since link scanners fetch GETs.
 *   POST (mail clients send `List-Unsubscribe=One-Click`; the page's button sends the same): sets
 *       `profiles.notify_email = false`, 200 with a short page.
 *   400 missing or invalid link, 503 `CRON_SECRET` unset, 500 anything else. All answers are small HTML pages.
 */
import { z } from "zod";

import { unsubscribeTokenValid } from "@/lib/email/unsubscribe";
import { createAdminClient } from "@/lib/supabase/admin";

const linkSchema = z.object({
  u: z.uuid(),
  t: z.string().regex(/^[\w-]{1,128}$/),
});

/**
 * A minimal HTML page. Every value placed in it is fixed text or a checked uuid and base64url token, so nothing needs
 * escaping.
 *
 * @param status - HTTP status.
 * @param heading - The one line that says what happened.
 * @param body - Extra HTML under it.
 */
function page(status: number, heading: string, body = "") {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Session Coach</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5"><p>Session Coach</p><h1 style="font-size:1.5rem;font-weight:500">${heading}</h1>${body}</body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * The link's learner id when its token checks out, otherwise the page to answer with.
 *
 * @param request - Carries `u` and `t` in its query.
 */
function checkLink(request: Request): { userId: string; token: string } | Response {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const link = linkSchema.safeParse(params);
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[api/unsubscribe] CRON_SECRET is not set");
    return page(503, "Unsubscribing isn't available right now. Turn reminders off in Settings.");
  }
  if (!link.success || !unsubscribeTokenValid(link.data.u, link.data.t, secret)) {
    return page(400, "This unsubscribe link isn't valid. Turn reminders off in Settings instead.");
  }
  return { userId: link.data.u, token: link.data.t };
}

/**
 * Asks before unsubscribing, so a mail scanner opening the link doesn't turn reminders off.
 *
 * @param request - The link from the email.
 */
export function GET(request: Request) {
  const link = checkLink(request);
  if (link instanceof Response) return link;
  const action = `/api/unsubscribe?u=${link.userId}&t=${link.token}`;
  return page(
    200,
    "Stop the daily review email?",
    `<p>You won't get the daily reminder any more. You can turn it back on in Settings.</p><form method="post" action="${action}"><input type="hidden" name="List-Unsubscribe" value="One-Click"><button type="submit">Unsubscribe</button></form>`,
  );
}

/**
 * Turns the daily email off for the link's learner. The signed token is the authorization: only this server can mint
 * one, and it names exactly one learner. A deleted learner's link updates nothing and still answers 200.
 *
 * @param request - The mail client's one-click POST, or the confirmation page's form.
 */
export async function POST(request: Request) {
  const link = checkLink(request);
  if (link instanceof Response) return link;
  try {
    const { error } = await createAdminClient()
      .from("profiles")
      .update({ notify_email: false })
      .eq("id", link.userId);
    if (error) throw new Error(error.message);
    return page(
      200,
      "You're unsubscribed",
      "<p>You won't get the daily review email any more. Turn it back on any time in Settings.</p>",
    );
  } catch (err) {
    console.error("[api/unsubscribe] failed", err instanceof Error ? err.message : err);
    return page(500, "That didn't work. Try the link again, or turn reminders off in Settings.");
  }
}
