import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addSyncHook, parseInitArgs, parseYesNo, syncHookCommand } from "./init.ts";

describe("parseInitArgs", () => {
  it("takes --url and --yes in any order", () => {
    assert.deepEqual(parseInitArgs([]), { url: null, yes: false });
    assert.deepEqual(parseInitArgs(["--yes", "--url", "http://localhost:3000"]), {
      url: "http://localhost:3000",
      yes: true,
    });
    assert.deepEqual(parseInitArgs(["--url=https://x.test", "-y"]), {
      url: "https://x.test",
      yes: true,
    });
  });

  it("refuses unknown, repeated and empty flags", () => {
    for (const bad of [["--token"], ["--yes", "--yes"], ["--url"], ["--url=a", "--url=b"]]) {
      assert.ok("error" in parseInitArgs(bad), bad.join(" "));
    }
  });
});

describe("addSyncHook", () => {
  const command = syncHookCommand("9.9.9");

  it("creates the settings when there is no file", () => {
    const edit = addSyncHook(null, "9.9.9");
    assert.equal(edit.kind, "added");
    const settings = JSON.parse((edit as { text: string }).text);
    assert.deepEqual(settings.hooks.SessionStart, [
      { matcher: "startup|resume|clear", hooks: [{ type: "command", command, async: true }] },
    ]);
  });

  it("keeps other settings and hooks, and appends after existing SessionStart groups", () => {
    const before = {
      model: "x",
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: "echo stop" }] }],
        SessionStart: [{ hooks: [{ type: "command", command: "echo hi" }] }],
      },
    };
    const edit = addSyncHook(JSON.stringify(before), "9.9.9");
    assert.equal(edit.kind, "added");
    const after = JSON.parse((edit as { text: string }).text);
    assert.equal(after.model, "x");
    assert.deepEqual(after.hooks.Stop, before.hooks.Stop);
    assert.equal(after.hooks.SessionStart.length, 2);
    assert.equal(after.hooks.SessionStart[0].hooks[0].command, "echo hi");
  });

  it("does nothing when a sync hook is already there, at any version", () => {
    for (const existing of ["npx --yes session-coach@0.1.0 sync", "session-coach sync"]) {
      const text = JSON.stringify({
        hooks: { SessionStart: [{ hooks: [{ type: "command", command: existing }] }] },
      });
      assert.deepEqual(addSyncHook(text), { kind: "present" }, existing);
    }
  });

  it("leaves a file it can't read alone", () => {
    for (const text of ["{ nope", "[]", '{"hooks": []}', '{"hooks": {"SessionStart": {}}}']) {
      assert.equal(addSyncHook(text).kind, "invalid", text);
    }
  });

  it("treats an empty file as no settings", () => {
    assert.equal(addSyncHook("  \n").kind, "added");
  });
});

describe("parseYesNo", () => {
  it("uses the default on Enter and reads y/n words", () => {
    assert.equal(parseYesNo("", true), true);
    assert.equal(parseYesNo("", false), false);
    assert.equal(parseYesNo(" Yes ", false), true);
    assert.equal(parseYesNo("no", true), false);
    assert.equal(parseYesNo("maybe", true), null);
  });
});
