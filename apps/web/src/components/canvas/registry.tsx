"use client";

// Everything on the canvas. Add, rename or remove an item here; the canvas itself needs no change. Every screen of an
// app route renders the route's real components with synthetic data (previews/options and previews/map), so the
// canvas can't drift from the app.

import { Canvas, type CanvasItem } from "./canvas";
import { LearnerPrototype } from "./previews/prototype";
import { mapRows } from "./previews/map/rows";
import { optionRows } from "./previews/options/rows";
import { ServerScreensContext, type ServerScreens } from "./previews/server-screens";

type Entry = Omit<CanvasItem, "x" | "y">;

/** Route previews are full pages at desktop size. */
const PAGE = { width: 1440, height: 900 };
const GAP = 120;
/** Between rows, below the tallest item; leaves room for the labels. */
const ROW_GAP = 320;

/**
 * Lays rows out top to bottom from y = `top`, each left to right from x = 0. Positions are only the starting layout;
 * dragging saves new ones.
 */
function stack(top: number, rows: Entry[][]): CanvasItem[] {
  let y = top;
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

// The clickable prototype sits above the rows, so it is the first thing to try. It is a hand-built walk through the
// learner app, not a route: see previews/prototype.tsx.
const prototypeItems = stack(-(PAGE.height + ROW_GAP), [
  [
    {
      id: "prototype-learner-app",
      name: "Prototype · learner app",
      ...PAGE,
      render: () => <LearnerPrototype />,
    },
  ],
]);

/** The picked design of each route, one row per route. */
const optionItems = stack(0, optionRows);

/** The app map (every route and state, and the flows between them) below the picked designs. */
const mapTop = Math.max(...optionItems.map((item) => item.y + item.height)) + ROW_GAP * 2;

export const canvasItems: CanvasItem[] = [
  ...prototypeItems,
  ...optionItems,
  ...stack(mapTop, mapRows),
];

/**
 * The page's only child: the canvas with every item above. Client-side, since each entry renders a component.
 * `screens` are the ones rendered on the server (see ServerScreens).
 */
export function IdeasCanvas({ screens }: { screens: ServerScreens }) {
  return (
    <ServerScreensContext value={screens}>
      <Canvas items={canvasItems} title="Session Coach ideas canvas" />
    </ServerScreensContext>
  );
}
