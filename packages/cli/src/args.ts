// Argument parsing for `login` and `push`. Pure, so node --test covers it without a terminal.

export type LoginArgs = { url: string | null } | { error: string };
export type PushArgs = { file: string } | { latest: true } | { error: string };

/** Accepts `--url value` and `--url=value`; anything else is an error. */
export function parseLoginArgs(args: string[]): LoginArgs {
  let url: string | null = null;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    let value: string | undefined;
    if (arg === "--url") {
      value = args[++i];
      if (value === undefined) return { error: "--url needs a value." };
    } else if (arg.startsWith("--url=")) {
      value = arg.slice("--url=".length);
    } else {
      return { error: `Unknown argument: ${arg}` };
    }
    if (url !== null) return { error: "--url was given twice." };
    url = value;
  }
  return { url };
}

/** `push` takes one file, or `--latest` alone; no other flags. */
export function parsePushArgs(args: string[]): PushArgs {
  const latest = args.includes("--latest");
  const others = args.filter((arg) => arg !== "--latest");
  if (latest && others.length > 0) return { error: "Use either a file or --latest, not both." };
  if (latest) {
    return args.length > 1 ? { error: "--latest was given twice." } : { latest: true };
  }
  const [file, ...rest] = args;
  if (!file) return { error: "push needs a file or --latest." };
  if (file.startsWith("-")) return { error: `Unknown argument: ${file}` };
  if (rest.length > 0) return { error: `Unknown argument: ${rest[0]}` };
  return { file };
}
