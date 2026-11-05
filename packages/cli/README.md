# session-coach

Uploads Claude Code session logs to Session Coach.

## Usage

Needs Node 20 or newer (tested on Node 22). Nothing to install first; `npx` fetches it.

```sh
npx session-coach init          # first time in a project: the guided setup
npx session-coach login
npx session-coach init
npx session-coach push --latest
npx session-coach push <file.jsonl>
npx session-coach sync
```

`login` prints a code and opens the app's `/cli/approve` page; check the code matches, click Approve, and the CLI saves its own token (device-code login, RFC 8628). Nothing to copy. Ctrl+C cancels; the code expires after 10 minutes. On a machine without a browser, open the printed address anywhere you're signed in. `login --token` instead asks for a token from the app's `/setup` page, checks it with the server and saves it only if it works. `push --latest` uploads the newest log of the project in the folder you run it from, and only that project (see [push](#push)). `sync` is for a Claude Code hook that uploads your finished sessions for you (see [sync](#sync)).

## init

New to Session Coach? Run `npx session-coach init` in the project's folder. It walks through four steps, says what each does before doing it, and changes nothing without a yes:

1. **Sign in**: the same browser login as `login`, skipped when you're already signed in.
2. **Turn on automatic uploads**: adds the [sync](#sync) hook to this project's `.claude/settings.json`, keeping every other setting and hook. It does nothing when the hook is already there, and leaves a file it can't read as JSON alone.
3. **Send your newest session**: offers to `push --latest` now.
4. **What happens next**: where the cards appear and how reviews come back.

`--yes` says yes to every step, for an agent or a script. Without a terminal and without `--yes`, every question is answered no. `--url` works as it does for `login`.

## Run from the repo (contributors)

```sh
# from the repo root
pnpm install
pnpm --filter session-coach start login [--url <site url>] [--token]
pnpm --filter session-coach start push <file.jsonl>
pnpm --filter session-coach start push --latest
pnpm --filter session-coach start sync
```

`pnpm --filter session-coach build` bundles the CLI into `dist/cli.js` (one file, Node 20+).

## push

`push <file>` redacts the log on your machine, then uploads it. The file's base name, excluding a trailing `.jsonl`, may use only letters, numbers, `-` and `_` (max 128 characters); the CLI won't rename it.

`push --latest` picks the newest `.jsonl` for the project in the current folder and pushes it exactly like `push <file>`. It prints the file's name and size (never its contents) before uploading. Use it instead of a file, not with one.

- Claude Code keeps logs in `~/.claude/projects/<folder>/`, where `<folder>` is the current directory with every character other than a letter, digit or `-` turned into `-`. Checked: `/` and `_`. Not checked: dots, spaces and other characters.
- Two folders can share one encoded name (`/work/a-b` and `/work/a/b`), so a log is chosen only if its recorded `cwd` (read from the first 64 KB, up to 50 lines) is the current folder. A log with no `cwd` is skipped; if none matches, nothing is uploaded.
- Only the top level of that folder is read; subfolders are ignored and no other project is tried.
- If the folder or a `.jsonl` is missing, it says so and exits non-zero.
- Run from inside Claude Code (`CLAUDECODE` is set), it skips logs written in the last minute: that is the session running the command, still being written.
- When run through `pnpm --filter`, the folder comes from `INIT_CWD` (where you typed the command), because pnpm runs the CLI from `packages/cli`.

## sync

`sync` uploads your finished sessions for the current project without you typing `push`. It runs from Claude Code `SessionEnd` and `SessionStart` hooks. You opt in per project with `init`; nothing is installed until you run it.

**Opt-in, best-effort redaction, Windows untested.** `sync` uploads logs without you looking at them first. Redaction runs on your machine, but it is best-effort and misses some secrets (see the known gaps in `docs/DECISIONS.md`). Add the hook only to projects whose sessions you are happy to upload. Windows paths and the Windows hook shell have not been tested; don't rely on `sync` there.

Run `npx session-coach login` once, then `npx session-coach init` in each project folder. `init` adds these hooks to the project's `.claude/settings.local.json` (your personal settings, not committed, so teammates don't run them), keeping everything else in the file and replacing any older session-coach hook. If the project is a git repo that doesn't ignore that file, `init` warns and prints the line to add to `.gitignore`; it never edits `.gitignore` itself:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear",
        "hooks": [
          { "type": "command", "command": "npx --yes session-coach@0.4.0 sync", "async": true }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          { "type": "command", "command": "npx --yes session-coach@0.4.0 sync", "timeout": 30 }
        ]
      }
    ]
  }
}
```

The version is the one `init` ran as, pinned so the hook doesn't run whatever is newest on npm at every session start. Run a newer `init` on purpose to move it.

**When a session ends**, `sync` starts a detached copy of itself and returns at once, because Claude Code may be quitting. The copy uploads the session that ended, with the same `cwd` check, unless it was already sent. The SessionEnd hook is not `async`: `claude -p` kills async hooks still running at teardown, which could stop `sync` before it starts the copy. Claude Code waits only for that handoff, usually a second or two for `npx` to start; `timeout: 30` raises the SessionEnd budget from its 1.5 s default so a slow start isn't cut off.

What it does on each start:

- Looks at the top level of the project's Claude Code log folder, with the same fail-closed `cwd` check as `push --latest` (see [push](#push)). The hook's own `cwd` is used when it gives one.
- Skips the session that is starting, logs last modified more than 7 days ago, and logs modified in the last 5 minutes (they may still be written to; they are picked up on a later start).
- Skips sessions it has already dealt with (see below), then uploads up to 1 finished session per start, newest first, exactly like `push`, redaction included. The rest follow on the next starts.
- A session the server already has (ready or processing) is skipped quietly. A session the server started but never got the log for is uploaded again.
- Gives up after 180 seconds, longer than the 120 s upload timeout plus two 15 s API calls. The SessionStart hook is `async: true`, so Claude Code doesn't wait for it, and the hooks docs say `timeout` isn't enforced on an async hook, which is why `sync` has its own limit.

**It prints nothing and always exits 0.** A hook's stdout goes into Claude's context, so `sync` writes nothing to stdout or stderr. Not signed in, offline, a refused token, the rate limit and server errors all end the run quietly. Look in `~/.session-coach/sync.log` for a one-line summary per run and for what went wrong. A start with nothing to upload writes no line, so the log doesn't grow on every session.

**State.** `~/.session-coach/sync-state.json` (next to `config.json`) lists the session ids already uploaded or failed, so a start doesn't redact and gzip the same logs again. It holds session ids, outcomes (`pushed` or `failed`) and timestamps, never log contents. `sync` records `pushed` as soon as the server accepts a session, so it never learns of a later model failure and never retries it; run `push <file>` to retry a failed session. A corrupt file is treated as empty. Deleting it (or losing it) is not always harmless: `sync` then asks the server about the recent logs again. A session that is ready or processing answers that it exists, but the server resets and re-runs a `failed` or stuck session on a repeat request (its cards are deleted and the model runs again, which costs model quota). No session is duplicated.

**Turn it off** by removing the hooks from `.claude/settings.local.json`.

Known limits: a session you resume after more than 5 minutes keeps writing to a log that `sync` may already have uploaded, and the server keeps the first upload. Two sessions starting at the same moment can both upload the same log; the server keeps one.
