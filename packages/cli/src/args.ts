// Argument parsing for `login` and `push`. Pure, so node --test covers it without a terminal.

export type LoginArgs = { url: string | null } | { error: string };
export type PushArgs = { file: string } | { error: string };

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

/** `push` takes exactly one file and no flags. */
export function parsePushArgs(args: string[]): PushArgs {
  const [file, ...rest] = args;
  if (!file) return { error: "push needs a file." };
  if (file.startsWith("-")) return { error: `Unknown argument: ${file}` };
  if (rest.length > 0) return { error: `Unknown argument: ${rest[0]}` };
  return { file };
}
