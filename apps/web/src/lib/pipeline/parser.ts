import { redact, redactHomePath } from "./redact.ts";

export type EventKind = "prompt" | "reply" | "write" | "edit" | "bash" | "read" | "result";

export type TimelineEvent = {
  id: string;
  kind: EventKind;
  text: string;
  /** 1-based line number in the raw file this event came from. */
  line: number;
};

/** Names only, never content: what the unknown skips were, grouped by where they showed up. */
export type UnknownBreakdown = {
  lineTypes: Record<string, number>;
  blockTypes: Record<string, number>;
  tools: Record<string, number>;
};

export type ParseStats = {
  totalLines: number;
  kept: number;
  dropped: number;
  sidechainSkipped: number;
  unknownSkipped: number;
  invalidJson: number;
  /** Tool results dropped because their call was Read or a tool we don't keep. */
  droppedToolResults: number;
  unknownBreakdown: UnknownBreakdown;
};

export const RESULT_MAX_CHARS = 500;

const DROPPED_TYPES = new Set([
  "mode",
  "last-prompt",
  "file-history-snapshot",
  "attachment",
  "ai-title",
  "permission-mode",
  "system",
  "file-history-delta",
]);
const INJECTED_TEXT = /^\s*<(command-name|local-command-stdout|local-command-caveat)>/;

type Block = Record<string, unknown>;
// `skipResultOf` is the tool_use id whose later tool_result we don't want.
type Unknown = { unknown: keyof UnknownBreakdown; name: string; skipResultOf?: string };
type Piece =
  | { kind: EventKind; text: string; skipResultOf?: string }
  | "drop"
  | "dropResult"
  | Unknown;

const unknownOf = (group: Unknown["unknown"], name: string): Unknown => ({ unknown: group, name });
const nameOf = (value: unknown): string =>
  typeof value === "string" && value !== "" ? value : "(none)";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function countLines(text: string): number {
  return text === "" ? 0 : text.split("\n").length;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function summarizeWrite(input: Block): string | undefined {
  const path = str(input.file_path);
  if (!path) return undefined;
  return `${path} — wrote ${plural(countLines(str(input.content) ?? ""), "line")}`;
}

function summarizeEdit(input: Block): string | undefined {
  const path = str(input.file_path);
  if (!path) return undefined;
  const next = str(input.new_string) ?? "";
  // Redact before cutting, so a secret split by the limit isn't left half visible.
  const first = redact(next.split("\n")[0]?.trim() ?? "").slice(0, 60);
  const counts = `replaced ${plural(countLines(str(input.old_string) ?? ""), "line")} with ${countLines(next)}`;
  return first ? `${path} — ${counts}: ${first}` : `${path} — ${counts}`;
}

function toolUse(block: Block): Piece {
  const input = isRecord(block.input) ? block.input : {};
  const badInput = unknownOf("tools", `${nameOf(block.name)} (unusable input)`);
  switch (block.name) {
    case "Write": {
      const text = summarizeWrite(input);
      return text ? { kind: "write", text } : badInput;
    }
    case "Edit": {
      const text = summarizeEdit(input);
      return text ? { kind: "edit", text } : badInput;
    }
    case "Bash": {
      const text = str(input.command);
      return text ? { kind: "bash", text } : badInput;
    }
    case "Read": {
      const text = str(input.file_path);
      const skipResultOf = str(block.id);
      return text ? { kind: "read", text, skipResultOf } : { ...badInput, skipResultOf };
    }
    default:
      return { ...unknownOf("tools", nameOf(block.name)), skipResultOf: str(block.id) };
  }
}

function toolResultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(isRecord)
    .map((part) => str(part.text) ?? "")
    .join("\n");
}

function userPieces(message: Block, isMeta: boolean, skippedToolIds: Set<string>): Piece[] {
  if (isMeta) return ["drop"];
  const content = message.content;
  const blocks: unknown[] =
    typeof content === "string"
      ? [{ type: "text", text: content }]
      : Array.isArray(content)
        ? content
        : [];
  if (blocks.length === 0) return [unknownOf("blockTypes", "user/(empty content)")];

  return blocks.map((block): Piece => {
    if (!isRecord(block)) return unknownOf("blockTypes", "user/(not an object)");
    if (block.type === "text") {
      const text = str(block.text);
      if (text === undefined) return unknownOf("blockTypes", "user/text (no text)");
      return INJECTED_TEXT.test(text) ? "drop" : { kind: "prompt", text };
    }
    if (block.type === "tool_result") {
      const callId = str(block.tool_use_id);
      if (callId !== undefined && skippedToolIds.has(callId)) return "dropResult";
      // Redact before cutting, so a secret split by the limit isn't left half visible.
      return {
        kind: "result",
        text: redact(toolResultText(block.content)).slice(0, RESULT_MAX_CHARS),
      };
    }
    return unknownOf("blockTypes", `user/${nameOf(block.type)}`);
  });
}

function assistantPieces(message: Block): Piece[] {
  const content = message.content;
  if (!Array.isArray(content) || content.length === 0)
    return [unknownOf("blockTypes", "assistant/(empty content)")];

  return content.map((block): Piece => {
    if (!isRecord(block)) return unknownOf("blockTypes", "assistant/(not an object)");
    switch (block.type) {
      case "text": {
        const text = str(block.text);
        return text === undefined
          ? unknownOf("blockTypes", "assistant/text (no text)")
          : { kind: "reply", text };
      }
      case "thinking":
      case "redacted_thinking":
        return "drop";
      case "tool_use":
        return toolUse(block);
      default:
        return unknownOf("blockTypes", `assistant/${nameOf(block.type)}`);
    }
  });
}

function piecesFor(entry: Block, skippedToolIds: Set<string>): Piece[] {
  if (entry.type !== "user" && entry.type !== "assistant")
    return [unknownOf("lineTypes", nameOf(entry.type))];
  if (!isRecord(entry.message)) return [unknownOf("lineTypes", `${entry.type} (no message)`)];
  if (entry.type === "user")
    return userPieces(entry.message, entry.isMeta === true, skippedToolIds);
  return assistantPieces(entry.message);
}

function countUnknown(stats: ParseStats, item: Unknown): void {
  const group = stats.unknownBreakdown[item.unknown];
  group[item.name] = (group[item.name] ?? 0) + 1;
  stats.unknownSkipped++;
}

export function parseSession(raw: string): { events: TimelineEvent[]; stats: ParseStats } {
  const events: TimelineEvent[] = [];
  const stats: ParseStats = {
    totalLines: 0,
    kept: 0,
    dropped: 0,
    sidechainSkipped: 0,
    unknownSkipped: 0,
    invalidJson: 0,
    droppedToolResults: 0,
    unknownBreakdown: { lineTypes: {}, blockTypes: {}, tools: {} },
  };
  // Calls are logged before their results, so one pass in file order is enough.
  const skippedToolIds = new Set<string>();

  const lines = raw.split(/\r?\n/);
  // A trailing newline leaves one empty string at the end; it is not a line.
  if (lines.at(-1) === "") lines.pop();
  stats.totalLines = lines.length;

  lines.forEach((text, index) => {
    const line = index + 1;
    if (text.trim() === "") return;

    let entry: unknown;
    try {
      entry = JSON.parse(text);
    } catch {
      countUnknown(stats, unknownOf("lineTypes", "(invalid json)"));
      stats.invalidJson++;
      return;
    }
    if (!isRecord(entry)) {
      countUnknown(stats, unknownOf("lineTypes", "(not an object)"));
      stats.invalidJson++;
      return;
    }

    if (entry.isSidechain === true) {
      stats.sidechainSkipped++;
      return;
    }
    if (typeof entry.type === "string" && DROPPED_TYPES.has(entry.type)) {
      stats.dropped++;
      return;
    }

    const pieces = piecesFor(entry, skippedToolIds);
    let keptHere = 0;
    let droppedHere = 0;
    let unknownHere = 0;
    for (const piece of pieces) {
      if (piece === "drop") {
        droppedHere++;
      } else if (piece === "dropResult") {
        droppedHere++;
        stats.droppedToolResults++;
      } else {
        if (piece.skipResultOf) skippedToolIds.add(piece.skipResultOf);
        if ("unknown" in piece) {
          unknownHere++;
          countUnknown(stats, piece);
        } else {
          keptHere++;
          // The read path keeps its structure: only the home prefix goes.
          const text = piece.kind === "read" ? redactHomePath(piece.text) : redact(piece.text);
          events.push({ id: `E${events.length + 1}`, kind: piece.kind, text, line });
        }
      }
    }
    // A line with nothing kept and nothing unrecognised was dropped on purpose.
    if (keptHere === 0 && unknownHere === 0 && droppedHere > 0) stats.dropped++;
  });

  stats.kept = events.length;
  return { events, stats };
}
