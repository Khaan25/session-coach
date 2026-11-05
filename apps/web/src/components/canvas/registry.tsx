"use client";

// Everything on the canvas: only what the app has. Every screen is an app route in one of its real states, or a flow
// between them, rendered from the route's real components with synthetic data (previews/map), so the canvas can't
// drift from the app.

import { Canvas, type CanvasItem } from "./canvas";
import { mapRows } from "./previews/map/rows";
import { ServerScreensContext, type ServerScreens } from "./previews/server-screens";

type Entry = Omit<CanvasItem, "x" | "y">;

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

/** The app map: every route and state, and the flows between them. */
export const canvasItems: CanvasItem[] = stack(0, mapRows);

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
