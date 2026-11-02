// Bundles the CLI, and the shared redactor it imports, into one plain JS file: dist/cli.js.
// Only `node:` builtins stay external, so the published package needs no dependencies and no workspace import.
// The shebang comes from the first line of src/cli.ts; esbuild keeps it at the top of the output.

import { chmod } from "node:fs/promises";

import { build } from "esbuild";

await build({
  entryPoints: ["src/cli.ts"],
  outfile: "dist/cli.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
});

await chmod("dist/cli.js", 0o755);
