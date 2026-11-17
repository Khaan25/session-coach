import { readFile } from "node:fs/promises";
import { parseSession } from "./parser.ts";

const SHOWN_CHARS = 100;
const WHITESPACE = /\s+/gu;

/** Prints the timeline and parse stats for the log at `path`; returns the exit code. */
async function main(path: string | undefined): Promise<number> {
  if (!path) {
    console.error("usage: print-timeline.ts <session-log.jsonl>");
    return 1;
  }

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    console.error(`cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const { events, stats } = parseSession(raw);

  for (const event of events) {
    const oneLine = event.text.replaceAll(WHITESPACE, " ").trim();
    const shown = oneLine.length > SHOWN_CHARS ? `${oneLine.slice(0, SHOWN_CHARS)}…` : oneLine;
    console.log(`${event.id.padEnd(6)}${event.kind.padEnd(8)}${shown}`);
  }

  console.log("");
  console.log(`total lines:        ${stats.totalLines}`);
  console.log(`kept events:        ${stats.kept}`);
  console.log(`dropped lines:      ${stats.dropped}`);
  console.log(
    `dropped results:    ${stats.droppedToolResults} (results of Read and unlisted tools)`,
  );
  console.log(`sidechain skipped:  ${stats.sidechainSkipped}`);
  console.log(`unknown skipped:    ${stats.unknownSkipped} (invalid JSON: ${stats.invalidJson})`);

  // Names and counts only, most frequent first.
  const groups = [
    ["line type", stats.unknownBreakdown.lineTypes],
    ["block type", stats.unknownBreakdown.blockTypes],
    ["tool", stats.unknownBreakdown.tools],
  ] as const;
  for (const [label, counts] of groups) {
    const sorted = Object.entries(counts).toSorted(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    for (const [name, count] of sorted) {
      console.log(`  ${label} ${name}: ${count}`);
    }
  }
  return 0;
}

process.exitCode = await main(process.argv.at(2));
