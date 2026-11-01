import { createInterface } from "node:readline";

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
      for (const char of chunk) {
        if (char === "\r" || char === "\n") return finish(() => resolve(value.trim()));
        if (char === "\u0003") return finish(() => reject(new Error("Cancelled.")));
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    input.on("data", onData);
  });
}
