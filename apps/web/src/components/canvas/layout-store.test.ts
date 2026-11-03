import assert from "node:assert/strict";
import { test } from "node:test";
import { loadLayout, saveLayout } from "./layout-store.ts";

const store = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
  },
});

const ids = new Set(["a", "b"]);
const empty = { camera: null, positions: {} };
const raw = (value: unknown) =>
  store.set(
    "session-coach:ideas-canvas",
    typeof value === "string" ? value : JSON.stringify(value),
  );

test("loadLayout gives the defaults for a missing, malformed or old save", () => {
  store.clear();
  assert.deepEqual(loadLayout(ids), empty);
  raw("{not json");
  assert.deepEqual(loadLayout(ids), empty);
  raw({ v: 1, camera: { x: 0, y: 0, z: 1 }, positions: { a: { x: 1, y: 2 } } });
  assert.deepEqual(loadLayout(ids), empty);
});

test("loadLayout keeps only a valid camera and valid positions for known ids", () => {
  saveLayout({
    camera: { x: 1, y: 2, z: 1 },
    positions: { a: { x: 3, y: 4 }, gone: { x: 0, y: 0 } },
  });
  assert.deepEqual(loadLayout(ids), {
    camera: { x: 1, y: 2, z: 1 },
    positions: { a: { x: 3, y: 4 } },
  });
  raw({
    v: 3,
    camera: { x: 0, y: 0, z: 99 },
    positions: { a: { x: "1", y: 0 }, b: { x: 1e9, y: 0 } },
  });
  assert.deepEqual(loadLayout(ids), empty);
});

test("saveLayout clamps far positions so they load back at the edge", () => {
  saveLayout({ camera: { x: -1e9, y: 0, z: 1 }, positions: { a: { x: 1e9, y: 5 } } });
  assert.deepEqual(loadLayout(ids), {
    camera: { x: -100_000, y: 0, z: 1 },
    positions: { a: { x: 100_000, y: 5 } },
  });
});
