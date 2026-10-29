"use client";

// The SSR entry: no React context, so it renders in this client component too.
import { CardsIcon, SealCheckIcon, TerminalWindowIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Facts only from docs/ARCHITECTURE.md (Review loop) and the how-it-works page.
const loop = ["Day 1", "Day 3", "Day 7"] as const;

const scores = [
  { score: 0, body: "Back to day 1" },
  { score: 1, body: "Back to day 1" },
  { score: 2, body: "On to the next gap" },
] as const;

function Rule() {
  return <span aria-hidden className="h-px min-w-3 flex-1 bg-line-row" />;
}

/** The review loop in one card: a session becomes cards, cards come back on day 1, 3 and 7, and a 2 moves them on. */
function ReviewLoop() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>After every session</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5">
          <ol className="flex items-center gap-2 type-label-sm text-text-2">
            <li className="flex flex-1 items-center gap-1.5">
              <TerminalWindowIcon weight="duotone" className="size-4 text-text-1" aria-hidden />
              Session
              <Rule />
            </li>
            <li className="flex items-center gap-1.5">
              <CardsIcon weight="duotone" className="size-4 text-text-1" aria-hidden />3 to 5 cards
            </li>
          </ol>
          <ol aria-label="Review schedule" className="flex items-center gap-2">
            {loop.map((day) => (
              <li key={day} className="flex flex-1 items-center gap-2">
                <Badge variant="outline">{day}</Badge>
                <Rule />
              </li>
            ))}
            <li>
              <Badge variant="success">
                <SealCheckIcon weight="fill" data-icon="inline-start" aria-hidden />
                Mastered
              </Badge>
            </li>
          </ol>
          <div className="flex flex-col gap-2">
            <p className="type-body-sm text-text-2">
              You explain each card back in your own words. A model scores the answer:
            </p>
            <dl className="grid grid-cols-3 gap-2">
              {scores.map(({ score, body }) => (
                <div key={score} className="flex flex-col gap-1 rounded-inner bg-well p-3">
                  <dt className="font-display text-4xl leading-none text-text-1 tabular-nums">
                    {score}
                  </dt>
                  <dd className="type-label-sm text-text-2">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Captions are lifted from the copy on those pages, so the panel never says something the page doesn't.
const SCENES = {
  "sign-in": { image: "sign-in", caption: null },
  "sign-up": { image: "sign-up", caption: null },
  email: { image: "letter", caption: "The link works once. Open it on this device to finish." },
  password: { image: "key", caption: "We'll email you a link to set a new password." },
  error: {
    image: "spill",
    caption: "Links in our emails work once and expire after a while. Ask for a new one.",
  },
} as const;

export type AuthScene = keyof typeof SCENES;

/**
 * The right half of the auth screens on large viewports: a watercolour desk scene for the screen's state, under the
 * review-loop card (sign-in, sign-up) or a one-line caption that repeats the page. Hidden under lg; the form column
 * stands alone on phones.
 */
export function AuthArt({ scene }: { scene: AuthScene }) {
  const { image, caption } = SCENES[scene];
  return (
    <aside
      // A caption only repeats the page's copy, so that panel is decoration.
      aria-label={caption ? undefined : "How Session Coach works"}
      aria-hidden={caption ? true : undefined}
      className="relative hidden overflow-hidden bg-page lg:flex lg:flex-col lg:items-center"
    >
      <div className="relative z-10 w-full max-w-md px-(--gutter) pt-24">
        {caption ? (
          <Card>
            <CardContent>
              <p className="type-body text-pretty text-text-2">{caption}</p>
            </CardContent>
          </Card>
        ) : (
          <ReviewLoop />
        )}
      </div>
      {/* Two keyed copies: the dark one keeps its paper so the scene reads as a lit sheet on a dark page. */}
      <Image
        src={`/art/auth/${image}.webp`}
        alt=""
        width={800}
        height={1200}
        sizes="50vw"
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl dark:hidden"
      />
      <Image
        src={`/art/auth/${image}-dark.webp`}
        alt=""
        width={800}
        height={1200}
        sizes="50vw"
        className="absolute inset-x-0 bottom-0 mx-auto hidden w-full max-w-2xl dark:block"
      />
    </aside>
  );
}

const ROUTE_SCENES: Record<string, AuthScene> = {
  "/sign-up": "sign-up",
  "/sign-up/check-email": "email",
  "/auth/confirm": "email",
  "/forgot-password": "password",
  "/update-password": "password",
  "/auth/error": "error",
};

/** The auth layout is shared by every route and a page can't pass props up to it, so the scene comes from the path. */
export function RouteAuthArt() {
  return <AuthArt scene={ROUTE_SCENES[usePathname()] ?? "sign-in"} />;
}
