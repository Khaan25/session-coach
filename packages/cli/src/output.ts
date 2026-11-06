// How the CLI writes to a terminal, after https://vercel.com/design/cli: a glyph gutter (✓ result, ! warning,
// ✗ error), label rows with values at column 18, recovery commands on their own line, and color only when the
// stream is a terminal. Pure, so node --test covers it without one.

export type Style = {
  /** Glyphs and layout for a person at a terminal; words (`Error:`, `Warning:`) otherwise. */
  rich: boolean;
  color: boolean;
};

/** A recovery or next step: what it does, then the exact command to run. */
export type Next = { text: string; command: string };

type Stream = { isTTY?: boolean };

/**
 * The style for one stream. Rich only on a terminal whose TERM isn't `dumb`. Color, highest first: `--no-color`, a
 * nonempty `NO_COLOR`, `FORCE_COLOR` (`0` means off), then rich.
 */
export function styleFor(
  stream: Stream,
  env: NodeJS.ProcessEnv = process.env,
  noColor = false,
): Style {
  const rich = stream.isTTY === true && env.TERM !== "dumb";
  let color = rich;
  if (noColor || env.NO_COLOR) color = false;
  else if (env.FORCE_COLOR !== undefined) color = env.FORCE_COLOR !== "0";
  return { rich, color };
}

const CODES = { bold: 1, red: 31, green: 32, yellow: 33, cyan: 36 } as const;

function paint(style: Style, code: keyof typeof CODES, text: string): string {
  return style.color ? `\u001b[${CODES[code]}m${text}\u001b[0m` : text;
}

/** Label rows: a 2-column gutter, a 16-character label, the value at column 18. */
export function rows(entries: [label: string, value: string][]): string {
  return entries.map(([label, value]) => `  ${label.padEnd(16)}${value}`).join("\n");
}

/** A command on its own line, under the instruction that says what it does. */
function step(style: Style, next: Next, indent: string): string {
  return `${indent}${next.text}:\n${indent}  ${paint(style, "cyan", next.command)}`;
}

/** The primary completed result. */
export function success(style: Style, headline: string, details: [string, string][] = []): string {
  const head = style.rich
    ? `${paint(style, "green", "✓")} ${paint(style, "bold", headline)}`
    : headline;
  return details.length ? `${head}\n${rows(details)}` : head;
}

/** A nonfatal condition that needs attention. */
export function warning(style: Style, text: string): string {
  return style.rich ? `${paint(style, "yellow", "!")} ${text}` : `Warning: ${text}`;
}

/** What failed and why, then detail or ID rows, then at most one recovery command. */
export function failure(
  style: Style,
  headline: string,
  details: [string, string][] = [],
  next?: Next,
): string {
  const head = style.rich ? `${paint(style, "red", "✗")} ${headline}` : `Error: ${headline}`;
  const body = details.length ? `${head}\n${rows(details)}` : head;
  return next ? `${body}\n\n${step(style, next, "  ")}` : body;
}

/** A next step after a result. */
export function nextStep(style: Style, next: Next): string {
  return step(style, next, "");
}

/** Quotes a path for a POSIX shell when it needs it, so a printed command runs as shown. */
export function shellArg(value: string): string {
  return /^[\w@%+=:,./-]+$/u.test(value) ? value : `'${value.replaceAll("'", `'\\''`)}'`;
}
