import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseSession, RESULT_MAX_CHARS } from "./parser.ts";

const fixture = readFileSync(new URL("./fixtures/session.fake.jsonl", import.meta.url), "utf8");
const { events, stats } = parseSession(fixture);

const line = (obj: unknown) => JSON.stringify(obj);
const user = (content: unknown, extra = {}) =>
  line({ type: "user", message: { role: "user", content }, ...extra });
const assistant = (content: unknown[]) =>
  line({ type: "assistant", message: { role: "assistant", content } });

test("keeps prompts, replies, tool calls and results with their raw line", () => {
  assert.deepEqual(
    events.map((e) => [e.id, e.kind, e.line]),
    [
      ["E1", "prompt", 3],
      ["E2", "reply", 5],
      ["E3", "read", 5],
      ["E4", "write", 9],
      ["E5", "edit", 10],
      ["E6", "bash", 14],
      ["E7", "result", 15],
      ["E8", "reply", 19],
      ["E9", "result", 20],
      ["E10", "result", 21],
    ],
  );
});

test("event text: prompt, read path, bash command, write and edit summaries", () => {
  const text = Object.fromEntries(events.map((e) => [e.id, e.text]));
  assert.equal(text.E1, "add a login page");
  assert.equal(text.E3, "/proj/demo/app.ts");
  assert.equal(text.E4, "/proj/demo/login.ts — wrote 3 lines");
  assert.equal(text.E5, "/proj/demo/app.ts — replaced 1 line with 2: export const app = 2;");
  assert.equal(text.E6, "pnpm test");
  assert.equal(text.E7, "all tests passed");
});

test("results of kept tools (Bash, Write, Edit) are still kept", () => {
  const results = events.filter((e) => e.kind === "result").map((e) => e.text);
  assert.deepEqual(results, ["all tests passed", "File created", "File updated"]);
});

test("a Read result is dropped but the read event stays with the path only", () => {
  const read = events.find((e) => e.kind === "read");
  assert.equal(read?.text, "/proj/demo/app.ts");
  assert.equal(
    events.some((e) => e.text.includes("export const app = 1;")),
    false,
  );
});

test("results of skipped tools are dropped and counted, the calls stay in the unknown breakdown", () => {
  assert.equal(
    events.some((e) => e.text.includes("clicked the button") || e.text.includes("login.ts:1")),
    false,
  );
  // Read (line 6), mcp__demo__click (23), Grep (24)
  assert.equal(stats.droppedToolResults, 3);
  assert.deepEqual(stats.unknownBreakdown.tools, {
    Grep: 1,
    mcp__demo__click: 1,
  });
});

test("a result with an unknown tool_use id is kept", () => {
  const result = parseSession(
    user([{ type: "tool_result", tool_use_id: "never-seen", content: "orphan" }]),
  );
  assert.deepEqual(
    result.events.map((e) => e.text),
    ["orphan"],
  );
  assert.equal(result.stats.droppedToolResults, 0);
});

test("tool results are not prompts and are cut to 500 characters", () => {
  const long = parseSession(
    user([{ type: "tool_result", tool_use_id: "t", content: "x".repeat(900) }]),
  );
  assert.equal(long.events[0]?.kind, "result");
  assert.equal(long.events[0]?.text.length, RESULT_MAX_CHARS);
});

test("an edit preview is redacted before the 60-character cut", () => {
  const fakeKey = "sk-FAKE0example0key0for0tests0only"; //allowlist secret
  const result = parseSession(
    assistant([
      {
        type: "tool_use",
        name: "Edit",
        input: {
          file_path: "/proj/demo/app.ts",
          old_string: "a",
          new_string: `${"x".repeat(49)} ${fakeKey}`,
        },
      },
    ]),
  );
  const text = result.events[0]?.text ?? "";
  assert.ok(text.includes("[REDACTED]"));
  assert.equal(text.includes("key0for0tests0only"), false);
  assert.equal(text.includes("sk-FAKE"), false);
});

test("drops thinking, attachments, mode, last-prompt and file-history-snapshot", () => {
  assert.equal(
    events.some((e) => e.text.includes("plan the page")),
    false,
  );
  // lines 1, 2, 4, 6, 11, 12, 13, 18, 23, 24 and the four bookkeeping lines 25-28
  assert.equal(stats.dropped, 14);
});

test("bookkeeping line types are dropped, not unknown", () => {
  const raw = ["ai-title", "permission-mode", "system", "file-history-delta"]
    .map((type) => line({ type }))
    .join("\n");
  const result = parseSession(raw);
  assert.equal(result.stats.dropped, 4);
  assert.equal(result.stats.unknownSkipped, 0);
  assert.equal(result.events.length, 0);
});

test("drops isMeta messages and injected command text", () => {
  const raw = [
    user("injected", { isMeta: true }),
    user("<command-name>/clear</command-name>"),
    user("<local-command-stdout>ok</local-command-stdout>"),
    user("<local-command-caveat>careful</local-command-caveat>"),
    user("a real prompt"),
  ].join("\n");
  const result = parseSession(raw);
  assert.deepEqual(
    result.events.map((e) => e.text),
    ["a real prompt"],
  );
  assert.equal(result.stats.dropped, 4);
});

test("drops compact summaries, which are model-written, not the learner's words", () => {
  const raw = [
    user("This session is being continued from a previous conversation...", {
      isCompactSummary: true,
    }),
    user("a real prompt"),
  ].join("\n");
  const result = parseSession(raw);
  assert.deepEqual(
    result.events.map((e) => e.text),
    ["a real prompt"],
  );
  assert.equal(result.stats.dropped, 1);
});

test("drops a tool result that is empty after trimming", () => {
  const result = parseSession(
    [
      user([{ type: "tool_result", tool_use_id: "t1", content: "" }]),
      user([{ type: "tool_result", tool_use_id: "t2", content: [{ type: "text", text: " \n " }] }]),
    ].join("\n"),
  );
  assert.equal(result.events.length, 0);
  assert.equal(result.stats.dropped, 2);
  assert.equal(result.stats.unknownSkipped, 0);
});

test("summarizes a MultiEdit call, and an unusable one stays unknown", () => {
  const result = parseSession(
    [
      assistant([
        {
          type: "tool_use",
          id: "m1",
          name: "MultiEdit",
          input: { file_path: "/proj/demo/app.ts", edits: [{}, {}] },
        },
      ]),
      assistant([
        {
          type: "tool_use",
          id: "m2",
          name: "MultiEdit",
          input: { file_path: "/proj/demo/app.ts" },
        },
      ]),
    ].join("\n"),
  );
  assert.deepEqual(
    result.events.map((e) => [e.kind, e.text]),
    [["edit", "/proj/demo/app.ts — 2 edits"]],
  );
  assert.deepEqual(result.stats.unknownBreakdown.tools, { "MultiEdit (unusable input)": 1 });
});

test("skips sidechain events and counts them", () => {
  assert.equal(stats.sidechainSkipped, 1);
  assert.equal(
    events.some((e) => e.text.includes("sub-agent")),
    false,
  );
});

test("numbers events in order and keeps counting across skipped lines", () => {
  assert.deepEqual(
    events.map((e) => e.id),
    events.map((_, i) => `E${i + 1}`),
  );
  assert.deepEqual(
    events.map((e) => e.line),
    events.map((e) => e.line).sort((a, b) => a - b),
  );
});

test("a broken line does not crash and is counted", () => {
  assert.equal(stats.invalidJson, 1);
  const result = parseSession(["{nope", user("still here")].join("\n"));
  assert.equal(result.events[0]?.line, 2);
  assert.equal(result.events[0]?.id, "E1");
});

test("unknown types and unknown tools are skipped and counted", () => {
  // invalid JSON line, "surprise" type, unlisted Grep and mcp__demo__click tools
  assert.equal(stats.unknownSkipped, 4);
  assert.equal(parseSession(assistant([{ type: "mystery" }])).stats.unknownSkipped, 1);
});

test("unknown breakdown counts names per line type, block type and tool, never content", () => {
  assert.deepEqual(stats.unknownBreakdown, {
    lineTypes: { "(invalid json)": 1, surprise: 1 },
    blockTypes: {},
    tools: { Grep: 1, mcp__demo__click: 1 },
  });

  const raw = [
    assistant([
      {
        type: "tool_use",
        name: "mcp__demo__click",
        input: { secret: "do-not-leak" },
      },
    ]),
    assistant([{ type: "tool_use", name: "mcp__demo__click", input: {} }]),
    assistant([{ type: "tool_use", name: "Write", input: {} }]),
    assistant([{ type: "mystery", text: "do-not-leak" }]),
    user([{ type: "image" }]),
    line({ type: "progress", data: "do-not-leak" }),
  ].join("\n");
  const result = parseSession(raw);
  assert.deepEqual(result.stats.unknownBreakdown, {
    lineTypes: { progress: 1 },
    blockTypes: { "assistant/mystery": 1, "user/image": 1 },
    tools: { mcp__demo__click: 2, "Write (unusable input)": 1 },
  });
  assert.equal(JSON.stringify(result.stats).includes("do-not-leak"), false);
  assert.equal(result.stats.unknownSkipped, 6);
});

test("stats add up", () => {
  assert.equal(stats.totalLines, 28);
  assert.equal(stats.kept, events.length);
  assert.equal(stats.kept, 10);
  const keptLines = new Set(events.map((e) => e.line)).size;
  assert.equal(
    keptLines + stats.dropped + stats.sidechainSkipped + stats.unknownSkipped,
    stats.totalLines,
  );
});
