import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { addSyncHooks, hasSyncHook, runInit, syncHooks } from "./init.ts";

describe("addSyncHooks", () => {
  it("adds both hooks to empty settings", () => {
    const out = addSyncHooks({}, "1.2.3") as { hooks: Record<string, unknown[]> };
    assert.deepEqual(out.hooks.SessionStart, [syncHooks("1.2.3").SessionStart]);
    assert.deepEqual(out.hooks.SessionEnd, [syncHooks("1.2.3").SessionEnd]);
  });

  it("keeps other settings and hooks, and replaces an older session-coach hook", () => {
    const other = { hooks: [{ type: "command", command: "echo hi" }] };
    const old = { hooks: [{ type: "command", command: "npx --yes session-coach@0.3.0 sync" }] };
    const out = addSyncHooks(
      { model: "x", hooks: { SessionStart: [other, old], Stop: [other] } },
      "0.4.0",
    ) as { model: string; hooks: Record<string, unknown[]> };
    assert.equal(out.model, "x");
    assert.deepEqual(out.hooks.Stop, [other]);
    assert.deepEqual(out.hooks.SessionStart, [other, syncHooks("0.4.0").SessionStart]);
  });

  it("is idempotent", () => {
    const once = addSyncHooks({}, "0.4.0") as Record<string, unknown>;
    assert.deepEqual(addSyncHooks(once, "0.4.0"), once);
  });

  it("refuses hooks it doesn't understand", () => {
    assert.ok("error" in addSyncHooks({ hooks: [] }, "0.4.0"));
    assert.ok("error" in addSyncHooks({ hooks: { SessionEnd: {} } }, "0.4.0"));
  });

  it("hasSyncHook finds ours only", () => {
    assert.equal(hasSyncHook(addSyncHooks({}, "0.4.0") as Record<string, unknown>), true);
    assert.equal(hasSyncHook({ hooks: { Stop: [{ hooks: [{ command: "echo" }] }] } }), false);
    assert.equal(hasSyncHook({}), false);
  });
});

describe("runInit", () => {
  it("writes settings.local.json, keeping what was there, and refuses a broken file", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "sc-init-"));
    try {
      const path = join(cwd, ".claude", "settings.local.json");
      await mkdir(join(cwd, ".claude"));
      await writeFile(path, JSON.stringify({ permissions: { allow: ["Bash(ls)"] } }));
      const ok = await runInit(cwd, "0.4.0");
      assert.equal(ok.exitCode, 0);
      const saved = JSON.parse(await readFile(path, "utf8"));
      assert.deepEqual(saved.permissions, { allow: ["Bash(ls)"] });
      assert.equal(hasSyncHook(saved), true);

      await writeFile(path, "not json");
      const bad = await runInit(cwd, "0.4.0");
      assert.equal(bad.exitCode, 1);
      assert.equal(await readFile(path, "utf8"), "not json");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
