// Runs parse -> extract -> checkEvidence on one local session log with the real callModel and prints the cards.
// Run it with `pnpm --filter web extract:session <session-log.jsonl>`; the script loads .env.local itself.
import { readFileSync } from "node:fs";
import { callModel } from "../model/call-model.ts";
import { checkEvidence } from "./evidence.ts";
import { extractCards } from "./extract.ts";
import { parseSession } from "./parser.ts";

const path = process.argv[2];
if (!path) {
  console.error("usage: run-extract.ts <session-log.jsonl>");
  process.exit(1);
}

let raw: string;
try {
  raw = readFileSync(path, "utf8");
} catch (error) {
  console.error(`cannot read ${path}: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

const { events } = parseSession(raw);
console.log(`${events.length} events parsed; asking the model...\n`);

const drafts = await extractCards(events, callModel);
const cards = checkEvidence(drafts, events);

for (const card of cards) {
  console.log(`#${card.position + 1} [${card.source}] ${card.decision}`);
  console.log(`  why: ${card.why}`);
  for (const item of card.evidence) {
    const where = item.file ? ` (${item.file})` : "";
    console.log(`  ${item.verified ? "✓" : "✗"} E${item.event_index}${where}: "${item.quote}"`);
  }
  console.log(`  files: ${card.files.length > 0 ? card.files.join(", ") : "none"}`);
  console.log(`  question: ${card.question}`);
  console.log(`  answer: ${card.model_answer}\n`);
}

const quotes = cards.flatMap((card) => card.evidence);
const downgraded = cards.filter(
  (card, i) => drafts[i]?.source === "stated" && card.source === "inferred",
);
console.log(
  `${cards.length} cards; ${quotes.filter((q) => q.verified).length}/${quotes.length} quotes verified; ${downgraded.length} stated -> inferred`,
);
