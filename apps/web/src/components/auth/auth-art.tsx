"use client";

// The SSR entry: no React context, so it renders in this client component too.
import {
  ArrowRightIcon,
  CheckCircleIcon,
  LockKeyIcon,
  SealCheckIcon,
} from "@phosphor-icons/react/ssr";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataList, DataListItem, DataListLabel, DataListValue } from "@/components/ui/data-list";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

// Facts only from README.md and docs/CODEBASE.md: up to 5 cards a session, 5 answers a day, reviews on day 1, 4 and
// 11, a 2 moves a card on, below 2 moves it one step back and it returns tomorrow, explained = scored 2 at least
// once, owned = mastered. The sample card is made up and never shows an answer key.

const SAMPLE = {
  session: "Add rate limiting to the upload route",
  decision: "Rate limit uploads per CLI token, not per IP",
  question: "Why key the upload limit on the token? What breaks if you key it on the IP instead?",
};

/** A decision card before it is answered: the question, and the why locked under it. */
function SampleCard({ caption }: { caption: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-inner bg-well p-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Decision card</Badge>
          <Badge variant="outline">Day 1</Badge>
        </div>
        <div className="flex flex-col gap-1">
          <p className="type-label text-text-1">{SAMPLE.decision}</p>
          <p className="type-body-sm text-text-2">
            From the session &ldquo;{SAMPLE.session}&rdquo;
          </p>
        </div>
        <p className="type-body text-pretty text-text-1">{SAMPLE.question}</p>
        <p className="flex items-center gap-2 type-body-sm text-text-2">
          <LockKeyIcon weight="duotone" className="size-4 shrink-0" aria-hidden />
          The why opens after you answer.
        </p>
      </div>
      <p className="type-body-sm text-pretty text-text-2">{caption}</p>
    </div>
  );
}

const DAYS = ["Day 1", "Day 4", "Day 11"] as const;

/** The review schedule as a strip, with the rule that moves a card under it. */
function ScheduleStrip() {
  return (
    <div className="flex flex-col gap-3">
      <ol aria-label="Review schedule" className="flex items-center gap-2">
        {DAYS.map((day) => (
          <li key={day} className="flex flex-1 items-center gap-2">
            <Badge variant="outline">{day}</Badge>
            <span aria-hidden className="h-px min-w-3 flex-1 bg-line-row" />
          </li>
        ))}
        <li>
          <Badge variant="success">
            <SealCheckIcon weight="fill" data-icon="inline-start" aria-hidden />
            Mastered
          </Badge>
        </li>
      </ol>
      <p className="type-body-sm text-pretty text-text-2">
        Explained (2) moves the card on. Partly (1) or missed (0) moves it back a step, and it comes
        back tomorrow. Never more than 5 answers a day.
      </p>
    </div>
  );
}

/** The three words the app uses everywhere, defined once. */
function Glossary() {
  return (
    <DataList orientation="vertical">
      <DataListItem>
        <DataListLabel>Decision card</DataListLabel>
        <DataListValue>
          One choice your agent made in a session, turned into a question you explain back. Up to 5
          per session.
        </DataListValue>
      </DataListItem>
      <DataListItem>
        <DataListLabel>Explained</DataListLabel>
        <DataListValue>You scored 2 on the card at least once.</DataListValue>
      </DataListItem>
      <DataListItem>
        <DataListLabel>Owned</DataListLabel>
        <DataListValue>You passed its day 11 review. The card is mastered.</DataListValue>
      </DataListItem>
    </DataList>
  );
}

/** Rows of an icon, a title and a line, as one list. */
function Rows({
  icon,
  rows,
}: {
  icon: React.ReactNode;
  rows: readonly { title: string; body: string }[];
}) {
  return (
    <ItemGroup>
      {rows.map((row) => (
        <Item key={row.title} variant="outline">
          <ItemMedia variant="icon">{icon}</ItemMedia>
          <ItemContent>
            <ItemTitle>{row.title}</ItemTitle>
            <ItemDescription>{row.body}</ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}

const HOW_IT_WORKS = [
  {
    title: "1. A session becomes cards",
    body: "The CLI uploads a Claude Code session. Up to 5 of its decisions become cards.",
  },
  {
    title: "2. You answer first",
    body: "Explain the decision in your own words. The why stays hidden until you do.",
  },
  {
    title: "3. Cards come back",
    body: "On day 1, day 4 and day 11, until you can explain each one.",
  },
] as const;

const KEPT = [
  { title: "Your decision cards", body: "Every card from every session stays." },
  { title: "Where each card is in its schedule", body: "A card on day 4 is still on day 4." },
  {
    title: "What you've explained and owned",
    body: "Explained is a 2 at least once. Owned is a passed day 11 review.",
  },
] as const;

// One panel per screen: the painting for its state, and what is worth knowing while the learner is there.
const SCENES = {
  "sign-in": {
    image: "sign-in",
    eyebrow: "What's waiting",
    title: "A decision card",
    body: (
      <>
        <SampleCard caption="Each card is one choice your agent made. You answer it from memory, then see the why." />
        <ScheduleStrip />
      </>
    ),
  },
  "sign-up": {
    image: "sign-up",
    eyebrow: "How it works",
    title: "Own the code your agent wrote",
    body: (
      <>
        <Rows icon={<CheckCircleIcon weight="duotone" aria-hidden />} rows={HOW_IT_WORKS} />
        <ScheduleStrip />
        <Glossary />
      </>
    ),
  },
  email: {
    image: "letter",
    eyebrow: "While you wait",
    title: "Your first card will look like this",
    body: (
      <>
        <SampleCard caption="You can't see the why yet, and that's the point: you answer first." />
        <Glossary />
      </>
    ),
  },
  password: {
    image: "key",
    eyebrow: "Nothing is lost",
    title: "A reset changes the password only",
    body: (
      <>
        <Rows icon={<CheckCircleIcon weight="duotone" aria-hidden />} rows={KEPT} />
        <ScheduleStrip />
      </>
    ),
  },
  "new-password": {
    image: "key",
    eyebrow: "Next: your dashboard",
    title: "Read your meter",
    body: (
      <>
        <div className="flex flex-col gap-1 rounded-inner bg-well p-4">
          <p className="type-label text-text-1">Explained 9 · owned 2 of 30</p>
          <p className="type-body-sm text-text-2">An example, not your numbers.</p>
        </div>
        <Glossary />
        <Rows
          icon={<ArrowRightIcon aria-hidden />}
          rows={[{ title: "Then open Review", body: "Cards due today, never more than 5." }]}
        />
      </>
    ),
  },
  error: {
    image: "spill",
    eyebrow: "Why this happens",
    title: "Email links work once",
    body: (
      <>
        <p className="type-body text-pretty text-text-2">
          Each link in our emails works once and expires after a while. Reset links also work only
          in the browser you asked from. Opening one twice lands here.
        </p>
        <Rows
          icon={<SealCheckIcon weight="duotone" aria-hidden />}
          rows={[
            {
              title: "Nothing you learned changed",
              body: "Your cards, their days in the schedule and what you've explained and owned are as you left them.",
            },
          ]}
        />
      </>
    ),
  },
} as const;

export type AuthScene = keyof typeof SCENES;

/**
 * The right half of the auth screens on large viewports: the watercolour desk scene for the screen's state, under a
 * card that explains the product for that moment. Hidden under lg, so on phones the form column stands alone. It
 * comes after the form in the DOM and holds nothing focusable, so it never sits in the form's tab order.
 */
export function AuthArt({ scene }: { scene: AuthScene }) {
  const { image, eyebrow, title, body } = SCENES[scene];
  return (
    <aside
      aria-labelledby="auth-panel-title"
      className="relative hidden overflow-hidden bg-page lg:flex lg:flex-col lg:items-center"
    >
      <div className="relative z-10 w-full max-w-lg px-(--gutter) pt-24 pb-16">
        <Card size="lg">
          <CardContent>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <p className="type-label-sm text-text-2">{eyebrow}</p>
                <h2
                  id="auth-panel-title"
                  className="font-display text-4xl leading-none tracking-tight text-balance text-text-1"
                >
                  {title}
                </h2>
              </div>
              {body}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Two paintings: the day scene on light paper, and a night scene painted on the dark page colour. */}
      <Image
        src={`/art/auth/${image}.webp`}
        alt=""
        width={800}
        height={1200}
        sizes="50vw"
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl dark:hidden"
      />
      <Image
        src={`/art/auth/${image}-night.webp`}
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
  "/update-password": "new-password",
  "/auth/error": "error",
};

/** The auth layout is shared by every route and a page can't pass props up to it, so the scene comes from the path. */
export function RouteAuthArt() {
  return <AuthArt scene={ROUTE_SCENES[usePathname()] ?? "sign-in"} />;
}
