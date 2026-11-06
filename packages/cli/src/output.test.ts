import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { failure, shellArg, styleFor, success, warning } from "./output.ts";

const RICH = { rich: true, color: false };
const PLAIN = { rich: false, color: false };

describe("styleFor", () => {
  it("is rich and colored only on a terminal that isn't dumb", () => {
    assert.deepEqual(styleFor({ isTTY: true }, {}), { rich: true, color: true });
    assert.deepEqual(styleFor({ isTTY: false }, {}), { rich: false, color: false });
    assert.deepEqual(styleFor({ isTTY: true }, { TERM: "dumb" }), { rich: false, color: false });
  });

  it("takes --no-color, then NO_COLOR, then FORCE_COLOR", () => {
    assert.equal(styleFor({ isTTY: true }, { FORCE_COLOR: "1" }, true).color, false);
    assert.equal(styleFor({ isTTY: true }, { NO_COLOR: "1", FORCE_COLOR: "1" }).color, false);
    assert.equal(styleFor({ isTTY: true }, { NO_COLOR: "" }).color, true);
    assert.equal(styleFor({ isTTY: false }, { FORCE_COLOR: "1" }).color, true);
    assert.equal(styleFor({ isTTY: true }, { FORCE_COLOR: "0" }).color, false);
  });
});

describe("blocks", () => {
  it("uses glyphs when rich and words when plain", () => {
    assert.equal(success(RICH, "Uploaded"), "✓ Uploaded");
    assert.equal(success(PLAIN, "Uploaded"), "Uploaded");
    assert.equal(warning(RICH, "x"), "! x");
    assert.equal(warning(PLAIN, "x"), "Warning: x");
    assert.equal(failure(PLAIN, "x"), "Error: x");
  });

  it("puts values at column 18 and the recovery command on its own line", () => {
    assert.equal(
      failure(RICH, "Processing failed.", [["Session ID", "abc"]], {
        text: "Upload it again",
        command: "session-coach push --latest",
      }),
      [
        "✗ Processing failed.",
        "  Session ID      abc",
        "",
        "  Upload it again:",
        "    session-coach push --latest",
      ].join("\n"),
    );
  });

  it("adds color codes only when color is on", () => {
    assert.ok(success({ rich: true, color: true }, "x").startsWith("\u001b[32m✓"));
  });
});

describe("shellArg", () => {
  it("leaves plain paths alone and quotes the rest", () => {
    assert.equal(shellArg("/tmp/a-b_c.jsonl"), "/tmp/a-b_c.jsonl");
    assert.equal(shellArg("my log.jsonl"), "'my log.jsonl'");
    assert.equal(shellArg("it's.jsonl"), `'it'\\''s.jsonl'`);
  });
});
