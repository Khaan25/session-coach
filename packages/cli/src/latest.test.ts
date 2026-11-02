import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { findLatestLog, formatSize, projectDirName, resolveCwd } from "./latest.ts";
import { validateFileName } from "./push.ts";

describe("projectDirName", () => {
  it("replaces / and _ with -", () => {
    assert.equal(
      projectDirName("/Users/x/Developer/session-coach"),
      "-Users-x-Developer-session-coach",
    );
    assert.equal(
      projectDirName("/Users/x/Developer/Personal_Projects/KASAM_PORTFOLIO"),
      "-Users-x-Developer-Personal-Projects-KASAM-PORTFOLIO",
    );
  });
});

describe("resolveCwd", () => {
  it("prefers INIT_CWD, and falls back when it is unset or empty", () => {
    assert.equal(resolveCwd({ INIT_CWD: "/repo" }, "/repo/packages/cli"), "/repo");
    assert.equal(resolveCwd({}, "/repo/packages/cli"), "/repo/packages/cli");
    assert.equal(resolveCwd({ INIT_CWD: "" }, "/repo/packages/cli"), "/repo/packages/cli");
  });
});

describe("formatSize", () => {
  it("uses B, KB and MB", () => {
    assert.equal(formatSize(512), "512 B");
    assert.equal(formatSize(2048), "2.0 KB");
    assert.equal(formatSize(3 * 1024 * 1024), "3.0 MB");
  });
});

describe("findLatestLog", () => {
  const cwd = "/work/my_project";
  let projects: string;
  let dir: string;

  // A fresh projects folder per test, so no test sees another's files.
  beforeEach(async () => {
    projects = await mkdtemp(join(tmpdir(), "sc-projects-"));
    dir = join(projects, projectDirName(cwd));
  });
  afterEach(() => rm(projects, { recursive: true, force: true }));

  /** Writes a fake log and sets its modified time (seconds since epoch). */
  async function log(folder: string, name: string, body: string, mtime: number) {
    await mkdir(folder, { recursive: true });
    const path = join(folder, name);
    await writeFile(path, body);
    await utimes(path, mtime, mtime);
  }

  /** A fake log body: a first line without a `cwd` (as Claude Code writes some), then one that records it. */
  function body(recorded: string): string {
    return `${JSON.stringify({ type: "summary" })}\n${JSON.stringify({ type: "user", cwd: recorded })}\n`;
  }

  it("says so when the project folder does not exist", async () => {
    assert.deepEqual(await findLatestLog(projects, cwd), {
      error: `No Claude Code logs found in ${dir}.`,
    });
  });

  it("says so when the folder has no .jsonl", async () => {
    await log(dir, "notes.txt", body(cwd), 1000);
    assert.deepEqual(await findLatestLog(projects, cwd), {
      error: `No .jsonl logs found in ${dir}.`,
    });
  });

  it("picks the newest .jsonl by modified time, ignoring other files and subfolders", async () => {
    await log(dir, "old.jsonl", body(cwd), 1000);
    await log(dir, "new.jsonl", body(cwd), 3000);
    await log(dir, "newer.txt", body(cwd), 5000);
    await log(join(dir, "sub"), "deep.jsonl", body(cwd), 9000);
    assert.deepEqual(await findLatestLog(projects, cwd), {
      path: join(dir, "new.jsonl"),
      name: "new.jsonl",
      size: Buffer.byteLength(body(cwd)),
    });
  });

  it("does not look at another project's folder", async () => {
    await log(join(projects, projectDirName("/other")), "x.jsonl", body("/other"), 9999);
    const result = await findLatestLog(projects, "/work/empty_project");
    assert.ok("error" in result);
  });

  describe("two projects whose folders encode to the same name", () => {
    const mine = "/work/a-b";
    const other = "/work/a/b";

    it("chooses nothing when the newest log belongs to the other project", async () => {
      assert.equal(projectDirName(mine), projectDirName(other));
      const shared = join(projects, projectDirName(mine));
      await log(shared, "theirs.jsonl", body(other), 5000);
      const result = await findLatestLog(projects, mine);
      assert.deepEqual(result, {
        error: `No log in ${shared} was recorded in this folder (${mine}), so nothing was chosen.`,
      });
    });

    it("chooses the older matching log when there is one", async () => {
      const shared = join(projects, projectDirName(mine));
      await log(shared, "mine.jsonl", body(mine), 1000);
      await log(shared, "theirs.jsonl", body(other), 5000);
      const result = await findLatestLog(projects, mine);
      assert.ok("name" in result);
      assert.equal(result.name, "mine.jsonl");
    });
  });

  it("skips a log with no cwd, even when it is the newest", async () => {
    await log(dir, "old.jsonl", body(cwd), 1000);
    await log(dir, "nocwd.jsonl", `${JSON.stringify({ type: "summary" })}\nnot json\n`, 5000);
    const result = await findLatestLog(projects, cwd);
    assert.ok("name" in result);
    assert.equal(result.name, "old.jsonl");
  });

  it("chooses nothing when no log records a cwd", async () => {
    await log(dir, "a.jsonl", `${JSON.stringify({ type: "summary" })}\n`, 5000);
    assert.ok("error" in (await findLatestLog(projects, cwd)));
  });

  it("ignores a trailing slash on the recorded cwd", async () => {
    await log(dir, "a.jsonl", body(`${cwd}/`), 1000);
    assert.ok("name" in (await findLatestLog(projects, cwd)));
  });

  it("accepts the realpath of the current folder", async () => {
    const real = join(projects, "real");
    const link = join(projects, "link");
    await mkdir(real);
    await symlink(real, link);
    const folder = join(projects, projectDirName(link));
    await log(folder, "a.jsonl", body(await realpath(real)), 1000);
    assert.ok("name" in (await findLatestLog(projects, link)));
  });

  it("finds the cwd only in the first 50 lines", async () => {
    const filler = `${JSON.stringify({ type: "x" })}\n`.repeat(50);
    await log(dir, "late.jsonl", `${filler}${JSON.stringify({ cwd })}\n`, 1000);
    assert.ok("error" in (await findLatestLog(projects, cwd)));
  });

  it("returns a file whose name the caller can reject, without renaming it", async () => {
    await log(dir, "my log.jsonl", body(cwd), 8000);
    const result = await findLatestLog(projects, cwd);
    assert.ok("name" in result);
    assert.equal(result.name, "my log.jsonl");
    assert.notEqual(validateFileName(result.name), null);
  });
});
