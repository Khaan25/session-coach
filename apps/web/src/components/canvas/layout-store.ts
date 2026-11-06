// The canvas remembers only where things are: the camera and each item's position, keyed by registry id. Names,
// sizes and membership always come from the registry, so a stale or edited save can never add, hide or rename an item.

export type Camera = { x: number; y: number; z: number };
export type Point = { x: number; y: number };
export type SavedLayout = { camera: Camera | null; positions: Record<string, Point> };

const KEY = "session-coach:ideas-canvas";
// 2: items became full 1440x900 pages, so positions saved for the small previews would overlap.
// 3: the report row grew from two pages to five; old saves put the new ones on top of the old.
// 4: the old preview rows went and the rows reflowed, so saved positions land on the wrong items.
// 5: the canvas became the new UI flow only; a saved camera framed the old, much wider map.
const VERSION = 5;
// Low enough that "Fit everything" fits the widest row on a laptop screen.
export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 3;
/** Coordinates past this are a corrupt save, not a layout. */
const LIMIT = 100_000;
/** More saved positions than this is not a save this canvas wrote. */
const MAX_POSITIONS = 500;
/** A save bigger than this is not one this canvas wrote. */
const MAX_BYTES = 64_000;

const finite = (value: unknown, limit = LIMIT): value is number =>
  typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;

const isPoint = (value: unknown): value is Point =>
  typeof value === "object" &&
  value !== null &&
  finite((value as Point).x) &&
  finite((value as Point).y);

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function isCamera(value: unknown): value is Camera {
  if (!isPoint(value)) return false;
  const z = (value as Camera).z;
  return finite(z) && z >= MIN_ZOOM && z <= MAX_ZOOM;
}

/**
 * Reads the saved layout, keeping only a valid camera and valid positions for ids still in the registry.
 * Anything malformed, unknown or unreadable gives the defaults.
 */
export function loadLayout(ids: ReadonlySet<string>): SavedLayout {
  const empty: SavedLayout = { camera: null, positions: {} };
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return empty;
  }
  if (!raw || raw.length > MAX_BYTES) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (typeof parsed !== "object" || parsed === null || (parsed as { v?: unknown }).v !== VERSION)
    return empty;
  const { camera, positions } = parsed as { camera?: unknown; positions?: unknown };
  const kept: Record<string, Point> = {};
  if (typeof positions === "object" && positions !== null) {
    for (const [id, point] of Object.entries(positions).slice(0, MAX_POSITIONS)) {
      if (ids.has(id) && isPoint(point)) kept[id] = { x: point.x, y: point.y };
    }
  }
  return { camera: isCamera(camera) ? camera : null, positions: kept };
}

/** Writes the layout; a full or blocked storage just means it isn't remembered. */
export function saveLayout(layout: SavedLayout) {
  try {
    // Clamped to what `loadLayout` accepts, so an item dragged far out comes back at the edge, not at its default.
    const clamp = (n: number) => Math.min(LIMIT, Math.max(-LIMIT, n));
    const point = (p: Point) => ({ x: clamp(p.x), y: clamp(p.y) });
    const camera = layout.camera && { ...point(layout.camera), z: layout.camera.z };
    const positions = Object.fromEntries(
      Object.entries(layout.positions).map(([id, p]) => [id, point(p)]),
    );
    window.localStorage.setItem(KEY, JSON.stringify({ v: VERSION, camera, positions }));
  } catch {
    // Quota or privacy mode: the canvas still works, it just forgets.
  }
}
