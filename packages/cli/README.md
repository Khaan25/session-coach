# session-coach

Uploads Claude Code session logs to Session Coach.

## Usage

Needs Node 20 or newer (tested on Node 22). Nothing to install first; `npx` fetches it.

```sh
npx session-coach login
npx session-coach push --latest
npx session-coach push <file.jsonl>
```

`login` asks for a CLI token from the app's `/setup` page. `push --latest` uploads the newest log of the project in the folder you run it from, and only that project (see [push](#push)).

## Run from the repo (contributors)

```sh
# from the repo root
pnpm install
pnpm --filter session-coach start login [--url <site url>]
pnpm --filter session-coach start push <file.jsonl>
pnpm --filter session-coach start push --latest
```

`pnpm --filter session-coach build` bundles the CLI into `dist/cli.js` (one file, Node 20+).

## push

`push <file>` redacts the log on your machine, then uploads it. The file's base name, excluding a trailing `.jsonl`, may use only letters, numbers, `-` and `_` (max 128 characters); the CLI won't rename it.

`push --latest` picks the newest `.jsonl` for the project in the current folder and pushes it exactly like `push <file>`. It prints the file's name and size (never its contents) before uploading. Use it instead of a file, not with one.

- Claude Code keeps logs in `~/.claude/projects/<folder>/`, where `<folder>` is the current directory with every character other than a letter, digit or `-` turned into `-`. Checked: `/` and `_`. Not checked: dots, spaces and other characters.
- Two folders can share one encoded name (`/work/a-b` and `/work/a/b`), so a log is chosen only if its recorded `cwd` (read from the first 64 KB, up to 50 lines) is the current folder. A log with no `cwd` is skipped; if none matches, nothing is uploaded.
- Only the top level of that folder is read; subfolders are ignored and no other project is tried.
- If the folder or a `.jsonl` is missing, it says so and exits non-zero.
- When run through `pnpm --filter`, the folder comes from `INIT_CWD` (where you typed the command), because pnpm runs the CLI from `packages/cli`.
