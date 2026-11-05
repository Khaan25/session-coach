import { createInterface } from "node:readline";

/** CSI (arrows, Home/End, Delete) and SS3 escape sequences, or a lone escape plus the byte after it. */
// oxlint-disable-next-line no-control-regex -- matching ESC is the point
const ESCAPE_SEQUENCE = /\u001b(?:\[[0-?]*[ -/]*[@-~]|O[@-~]|.)?/gsu;

const CONTROL_CHAR = /\p{Cc}/u;

/**
 * Applies one chunk of typed keys to the secret. Escape sequences are dropped whole and control characters skipped, so
 * only printable text reaches the value.
 *
 * @returns The new value, and `done` when Enter or Ctrl-C ended the input (characters after it are ignored).
 */
export function applyKeys(
  value: string,
  chunk: string,
): { value: string; done: "enter" | "cancel" | null } {
  for (const char of chunk.replace(ESCAPE_SEQUENCE, "")) {
    if (char === "\r" || char === "\n") return { value, done: "enter" };
    if (char === "\u0003") return { value, done: "cancel" };
    if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
    else if (!CONTROL_CHAR.test(char)) value += char;
  }
  return { value, done: null };
}

/**
 * Asks for a secret without echoing it. On a terminal the typed characters are never written; when stdin is piped
 * (scripts, tests) it reads the first line.
 */
export function promptHidden(question: string): Promise<string> {
  const input = process.stdin;
  const output = process.stdout;
  output.write(question);

  if (!input.isTTY) {
    return new Promise((resolve) => {
      const rl = createInterface({ input });
      rl.once("line", (line) => {
        resolve(line.trim());
        rl.close();
        output.write("\n");
      });
      rl.once("close", () => resolve(""));
    });
  }

  return new Promise((resolve, reject) => {
    let value = "";
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");

    const finish = (done: () => void) => {
      input.setRawMode(false);
      input.pause();
      input.off("data", onData);
      output.write("\n");
      done();
    };
    const onData = (chunk: string) => {
      const next = applyKeys(value, chunk);
      value = next.value;
      if (next.done === "enter") finish(() => resolve(value.trim()));
      else if (next.done === "cancel") finish(() => reject(new Error("Cancelled.")));
    };
    input.on("data", onData);
  });
}

/** Asks one question and reads one line, echoed as typed. Resolves "" when input ends (Ctrl-D, closed pipe). */
export function promptLine(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    let answered = false;
    rl.question(question, (answer) => {
      answered = true;
      rl.close();
      resolve(answer);
    });
    rl.once("close", () => {
      if (!answered) resolve("");
    });
  });
}
