// The gallery's only example data: a copy of the shared sample session and its visible decision cards, holding
// only the fields the gallery shows. A copy, not an import of the fixture: client components import this module, and
// importing the JSON would ship every card's answer key (`model_answer`) to the browser. `sample.test.ts` checks
// that this copy still matches the fixture.
const session = {
  id: "5c1e0f0a-3b8e-4c6a-9f1d-2a7b8c9d0e11",
  external_id: "7f3a9c21-5d4e-4b6f-a1c2-d3e4f5a6b7c8",
  agent: "claude-code",
  title: "Write transcriptParser.ts",
  repo: "rapporteur",
  branch: "main",
  duration_min: 42,
  event_count: 412,
  raw_path: "0b7d2c4e-1a3f-4e5b-8c6d-7e8f9a0b1c2d/7f3a9c21-5d4e-4b6f-a1c2-d3e4f5a6b7c8.jsonl.gz",
  status: "ready",
  error: null,
  created_at: "2026-10-27T16:40:00+05:45",
};

// Hidden cards are left out, as a learner never sees them.
const cards = [
  {
    id: "9a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
    position: 0,
    decision: "Use ESM imports with .js extensions in the new parser",
    why: "Matches the convention already used in resultSchema.ts",
    source: "stated",
    evidence: [
      {
        event_index: 2,
        quote: "matching resultSchema.ts's convention",
        file: null,
        lines: null,
        verified: true,
      },
    ],
    files: ["server/src/lib/transcriptParser.ts"],
    question: "Why did the agent write imports with .js extensions?",
    flagged: false,
  },
  {
    id: "1d2e3f4a-5b6c-4d7e-9f8a-0b1c2d3e4f5a",
    position: 1,
    decision: "SAMPLE: skip unknown JSONL line types instead of throwing",
    why: "SAMPLE: Claude Code adds line types without notice, so one new type should not fail the whole session",
    source: "inferred",
    evidence: [
      {
        event_index: 3,
        quote: "WRITE server/src/lib/transcriptParser.ts",
        file: "server/src/lib/transcriptParser.ts",
        lines: [12, 30],
        verified: true,
      },
    ],
    files: ["server/src/lib/transcriptParser.ts"],
    question: "What happens to a line type the parser doesn't know, and why?",
    flagged: false,
  },
  {
    id: "2e3f4a5b-6c7d-4e8f-8a9b-1c2d3e4f5a6b",
    position: 2,
    decision: "SAMPLE: number events after filtering, keep a map to the raw line",
    why: "SAMPLE: the model cites short ids like E2 and the server can still open the original line for auditing",
    source: "stated",
    evidence: [
      {
        event_index: 1,
        quote: "Do step 6: write transcriptParser.ts",
        file: null,
        lines: null,
        verified: true,
      },
      {
        event_index: 2,
        quote: "keep a map back to the raw line",
        file: null,
        lines: null,
        verified: false,
      },
    ],
    files: ["server/src/lib/transcriptParser.ts"],
    question: "Why number events after filtering instead of using raw JSONL line numbers?",
    flagged: true,
  },
];

// The loop: a session ends, 3 to 5 decision cards are written, and the learner explains each back on these days.
const REVIEW_DAYS = [1, 3, 7] as const;

export { cards, REVIEW_DAYS, session };
