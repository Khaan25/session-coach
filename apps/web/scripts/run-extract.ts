// Runs parse -> extract -> checkEvidence on one local session log with the real callModel and prints the cards.
// Run it with `pnpm --filter web extract:session <session-log.jsonl>`; the script loads .env.local itself.
import { readFileSync } from "node:fs";
import { callModel } from "../src/lib/model/call-model.ts";
import { checkEvidence, checkQuotes, isGrounded } from "../src/lib/pipeline/evidence.ts";
import { extractCards } from "../src/lib/pipeline/extract.ts";
import { parseSession } from "../src/lib/pipeline/parser.ts";

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

const { cards: drafts, title } = await extractCards(events, callModel);
console.log(`title: ${title ?? "(none)"}\n`);
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

for (const draft of drafts.filter((d) => !isGrounded(d, events))) {
  console.log(`DROPPED: ${draft.decision} — no grounded quote (prompt, reply or DECISIONS.md)`);
  for (const { event_index, quote, event, verified } of checkQuotes(draft, events)) {
    console.log(
      `  ${verified ? "✓" : "✗"} E${event_index} ${event?.kind ?? "no such event"}: "${quote}"`,
    );
  }
}

const quotes = cards.flatMap((card) => card.evidence);
console.log(
  `\n${drafts.length} extracted, ${cards.length} kept, ${drafts.length - cards.length} dropped; ${quotes.filter((q) => q.verified).length}/${quotes.length} quotes verified in kept cards`,
);
