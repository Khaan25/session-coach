// Argument parsing for `login` and `push`. Pure, so node --test covers it without a terminal.

/**
 * `token`: sign in by pasting a token from /setup instead of approving in the browser. `open`: false with `--no-open`,
 * which prints the approve address without opening a browser.
 */
export type LoginArgs = { url: string | null; token: boolean; open: boolean } | { error: string };
export type PushArgs = { file: string } | { latest: true } | { error: string };

/** Accepts `--url value`, `--url=value`, `--token` and `--no-open`; anything else is an error. */
export function parseLoginArgs(args: string[]): LoginArgs {
  let url: string | null = null;
  let token = false;
  let open = true;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    let value: string | undefined;
    if (arg === "--no-open") {
      if (!open) return { error: "--no-open was given twice." };
      open = false;
      continue;
    }
    if (arg === "--token") {
      if (token) return { error: "--token was given twice." };
      token = true;
      continue;
    }
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
  return { url, token, open };
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
