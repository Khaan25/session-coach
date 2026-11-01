import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyKeys } from "./prompt.ts";

describe("applyKeys", () => {
  it("appends printable text, including a pasted token", () => {
    assert.deepEqual(applyKeys("sc_", "abc123"), { value: "sc_abc123", done: null });
  });

  it("drops arrow, Delete, Home and End sequences whole", () => {
    const keys = "\u001b[A\u001b[B\u001b[C\u001b[D\u001b[3~\u001b[H\u001b[F\u001bOH\u001bOF";
    assert.deepEqual(applyKeys("sc_a", `${keys}b${keys}`), { value: "sc_ab", done: null });
  });

  it("skips control characters", () => {
    assert.deepEqual(applyKeys("", "a\u0000\u0001\tb\u001bc"), { value: "ab", done: null });
  });

  it("backspace removes the last character", () => {
    assert.deepEqual(applyKeys("sc_ab", "\u007f\b"), { value: "sc_", done: null });
  });

  it("Enter and Ctrl-C end the input", () => {
    assert.deepEqual(applyKeys("sc_", "ab\rzzz"), { value: "sc_ab", done: "enter" });
    assert.deepEqual(applyKeys("sc_", "a\u0003"), { value: "sc_a", done: "cancel" });
  });
});
