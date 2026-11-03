import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { loadState, saveState, syncPaths } from "./state.ts";

describe("sync state", () => {
  let dir: string;
  let path: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "sc-state-"));
    path = join(dir, "sub", "sync-state.json");
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it("keeps its files next to config.json", () => {
    const paths = syncPaths("/home/me");
    assert.equal(paths.state, join("/home/me", ".session-coach", "sync-state.json"));
    assert.equal(paths.log, join("/home/me", ".session-coach", "sync.log"));
  });

  it("round-trips, creating the folder and leaving no temporary file", async () => {
    const state = await loadState(path);
    state.done["abc-1"] = { outcome: "pushed", at: "2026-11-03T10:00:00.000Z" };
    state.done["abc-2"] = { outcome: "failed", at: "2026-11-03T10:01:00.000Z" };
    await saveState(path, state);
    const again = await loadState(path);
    assert.deepEqual(Object.keys(again.done), ["abc-1", "abc-2"]);
    assert.equal(again.done["abc-2"]?.outcome, "failed");
    assert.deepEqual(await readdir(join(dir, "sub")), ["sync-state.json"]);
  });

  it("is empty when the file is missing, corrupt, another version or the wrong shape", async () => {
    assert.deepEqual(Object.keys((await loadState(path)).done), []);
    await saveState(path, { version: 1, done: {} });
    for (const text of [
      "{not json",
      "",
      "null",
      "[]",
      '{"version":2,"done":{"a":{"outcome":"pushed","at":"x"}}}',
      '{"version":1,"done":[]}',
      '{"version":1,"done":"nope"}',
    ]) {
      await writeFile(path, text);
      assert.deepEqual(Object.keys((await loadState(path)).done), [], text);
    }
  });

  it("drops an entry of the wrong shape and keeps the good ones", async () => {
    await saveState(path, { version: 1, done: {} });
    await writeFile(
      path,
      JSON.stringify({
        version: 1,
        done: {
          good: { outcome: "pushed", at: "2026-11-03T10:00:00.000Z" },
          bad: { outcome: "weird", at: "x" },
          worse: null,
          noTime: { outcome: "pushed" },
        },
      }),
    );
    assert.deepEqual(Object.keys((await loadState(path)).done), ["good"]);
  });

  it("treats an id like __proto__ as an ordinary key", async () => {
    await saveState(path, { version: 1, done: {} });
    await writeFile(
      path,
      '{"version":1,"done":{"__proto__":{"outcome":"pushed","at":"2026-11-03T10:00:00.000Z"}}}',
    );
    const state = await loadState(path);
    assert.ok("__proto__" in state.done);
    assert.equal(Object.getPrototypeOf({}), Object.prototype);
  });

  it("writes the file readable by its owner only", async () => {
    await saveState(path, { version: 1, done: {} });
    if (process.platform !== "win32") {
      assert.equal((await stat(path)).mode & 0o777, 0o600);
    }
    assert.equal((await readFile(path, "utf8")).endsWith("\n"), true);
  });
});
