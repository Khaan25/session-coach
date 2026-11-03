// The canvas remembers only where things are: the camera and each item's position, keyed by registry id. Names,
// sizes and membership always come from the registry, so a stale or edited save can never add, hide or rename an item.

export type Camera = { x: number; y: number; z: number };
export type Point = { x: number; y: number };
export type SavedLayout = { camera: Camera | null; positions: Record<string, Point> };

const KEY = "session-coach:ideas-canvas";
// 2: items became full 1440x900 pages, so positions saved for the small previews would overlap.
// 3: the report row grew from two pages to five; old saves put the new ones on top of the old.
const VERSION = 3;
export const MIN_ZOOM = 0.1;
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
    window.localStorage.setItem(KEY, JSON.stringify({ v: VERSION, ...layout }));
  } catch {
    // Quota or privacy mode: the canvas still works, it just forgets.
  }
}
