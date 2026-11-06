"use client";

// Everything on the canvas: the new UI flow, one row per stage, left to right in the order a learner meets it. Every
// screen is an app route in one state, rendered from the route's real components with synthetic data
// (previews/flow-screens.tsx), so the canvas can't drift from the app.

import { Canvas, type CanvasItem } from "./canvas";
import {
  CliApproveScreen,
  DefendScreen,
  EmailScreen,
  ErrorScreen,
  LoadingScreen,
  LoginScreen,
  MembersScreen,
  ProgressScreen,
  PublicScreen,
  ReviewAnswerScreen,
  ReviewResultScreen,
  SettingsScreen,
  SetupScreen,
  SignUpScreen,
  TodayDoneScreen,
  TodayDueScreen,
  TodayFirstVisitScreen,
  TodayGuideOpenScreen,
} from "./previews/flow-screens";
import { ServerScreensContext, type ServerScreens } from "./previews/server-screens";

type Entry = Omit<CanvasItem, "x" | "y">;

const PAGE = { width: 1440, height: 900 };
const GAP = 120;
/** Between rows, below the tallest item; leaves room for the labels. */
const ROW_GAP = 320;

/** One full-page screen, named `<route> · <state>`; the id comes from the name, so the two never drift apart. */
const page = (route: string, state: string, render: () => React.ReactNode): Entry => {
  const name = `${route} · ${state}`;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return { id: `flow-${slug}`, name, ...PAGE, render };
};

const rows: Entry[][] = [
  // 1. Marketing
  [
    page("/", "signed out", () => <PublicScreen name="home" />),
    page("/how-it-works", "default", () => <PublicScreen name="howItWorks" />),
    page("/pricing", "default", () => <PublicScreen name="pricing" />),
  ],
  // 2. Sign up and in
  [
    page("/sign-up", "default", () => <SignUpScreen />),
    page("/login", "default", () => <LoginScreen />),
    page("/cli/approve", "pending", () => <CliApproveScreen />),
  ],
  // 3. First visit
  [
    page("/dashboard", "first visit", () => <TodayFirstVisitScreen />),
    page("/dashboard", "first visit, setup guide open", () => <TodayGuideOpenScreen />),
    page("/setup", "no device", () => <SetupScreen />),
  ],
  // 4. The daily loop
  [
    page("/dashboard", "cards due", () => <TodayDueScreen />),
    page("/review/[cardId]", "answering", () => <ReviewAnswerScreen />),
    page("/review/[cardId]", "result", () => <ReviewResultScreen />),
    page("/dashboard", "done for today", () => <TodayDoneScreen />),
  ],
  // 5. Progress and the rest
  [
    page("/progress", "with data", () => <ProgressScreen />),
    page("/defend", "start", () => <DefendScreen />),
    page("/settings", "default", () => <SettingsScreen />),
    page("/members", "v2 note", () => <MembersScreen />),
    {
      id: "flow-email-daily-review",
      name: "email · daily review",
      width: 560,
      height: 520,
      render: () => <EmailScreen />,
    },
  ],
  // 6. States
  [
    page("/dashboard", "loading", () => <LoadingScreen />),
    page("/dashboard", "error", () => <ErrorScreen />),
  ],
];

/**
 * Lays the rows out top to bottom, each left to right from x = 0. Positions are only the starting layout; dragging
 * saves new ones.
 */
function stack(): CanvasItem[] {
  let y = 0;
  return rows.flatMap((entries) => {
    let x = 0;
    const items = entries.map((entry) => {
      const item = { ...entry, x, y };
      x += entry.width + GAP;
      return item;
    });
    y += Math.max(...entries.map((entry) => entry.height)) + ROW_GAP;
    return items;
  });
}

export const canvasItems: CanvasItem[] = stack();

/**
 * The page's only child: the canvas with every item above. Client-side, since each entry renders a component.
 * `screens` are the ones rendered on the server (see ServerScreens).
 */
export function IdeasCanvas({ screens }: { screens: ServerScreens }) {
  return (
    <ServerScreensContext value={screens}>
      <Canvas items={canvasItems} title="Session Coach UI flow" />
    </ServerScreensContext>
  );
}
