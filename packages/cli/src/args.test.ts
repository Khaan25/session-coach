import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseLoginArgs, parsePushArgs } from "./args.ts";

describe("parseLoginArgs", () => {
  it("accepts --url value, --url=value and no flag", () => {
    assert.deepEqual(parseLoginArgs(["--url", "http://localhost:3000"]), {
      url: "http://localhost:3000",
    });
    assert.deepEqual(parseLoginArgs(["--url=http://localhost:3000"]), {
      url: "http://localhost:3000",
    });
    assert.deepEqual(parseLoginArgs([]), { url: null });
  });

  it("rejects unknown arguments, a missing value and a repeated flag", () => {
    assert.deepEqual(parseLoginArgs(["--ulr", "x"]), { error: "Unknown argument: --ulr" });
    assert.deepEqual(parseLoginArgs(["stray"]), { error: "Unknown argument: stray" });
    assert.deepEqual(parseLoginArgs(["--url"]), { error: "--url needs a value." });
    assert.ok("error" in parseLoginArgs(["--url=a", "--url", "b"]));
  });
});

describe("parsePushArgs", () => {
  it("takes one file", () => {
    assert.deepEqual(parsePushArgs(["abc.jsonl"]), { file: "abc.jsonl" });
  });

  it("takes --latest alone", () => {
    assert.deepEqual(parsePushArgs(["--latest"]), { latest: true });
  });

  it("rejects --latest with a file, twice, or with a value", () => {
    assert.deepEqual(parsePushArgs(["--latest", "a.jsonl"]), {
      error: "Use either a file or --latest, not both.",
    });
    assert.deepEqual(parsePushArgs(["a.jsonl", "--latest"]), {
      error: "Use either a file or --latest, not both.",
    });
    assert.deepEqual(parsePushArgs(["--latest", "--latest"]), {
      error: "--latest was given twice.",
    });
    assert.deepEqual(parsePushArgs(["--latest=x"]), { error: "Unknown argument: --latest=x" });
  });

  it("rejects no file, flags and extra arguments", () => {
    assert.ok("error" in parsePushArgs([]));
    assert.deepEqual(parsePushArgs(["--force"]), { error: "Unknown argument: --force" });
    assert.deepEqual(parsePushArgs(["a.jsonl", "b.jsonl"]), { error: "Unknown argument: b.jsonl" });
  });
});
