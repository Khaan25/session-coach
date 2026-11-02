import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

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

  before(async () => {
    projects = await mkdtemp(join(tmpdir(), "sc-projects-"));
    dir = join(projects, projectDirName(cwd));
  });
  after(() => rm(projects, { recursive: true, force: true }));

  /** Writes a fake log and sets its modified time (seconds since epoch). */
  async function log(folder: string, name: string, body: string, mtime: number) {
    await mkdir(folder, { recursive: true });
    const path = join(folder, name);
    await writeFile(path, body);
    await utimes(path, mtime, mtime);
  }

  it("says so when the project folder does not exist", async () => {
    assert.deepEqual(await findLatestLog(projects, cwd), {
      error: `No Claude Code logs found in ${dir}.`,
    });
  });

  it("says so when the folder has no .jsonl", async () => {
    await log(dir, "notes.txt", "x", 1000);
    assert.deepEqual(await findLatestLog(projects, cwd), {
      error: `No .jsonl logs found in ${dir}.`,
    });
  });

  it("picks the newest .jsonl by modified time, ignoring other files and subfolders", async () => {
    await log(dir, "old.jsonl", "aa", 1000);
    await log(dir, "new.jsonl", "bbbb", 3000);
    await log(dir, "newer.txt", "x", 5000);
    await log(join(dir, "sub"), "deep.jsonl", "x", 9000);
    assert.deepEqual(await findLatestLog(projects, cwd), {
      path: join(dir, "new.jsonl"),
      name: "new.jsonl",
      size: 4,
    });
  });

  it("does not look at another project's folder", async () => {
    await log(join(projects, projectDirName("/other")), "x.jsonl", "x", 9999);
    const result = await findLatestLog(projects, "/work/empty_project");
    assert.ok("error" in result);
  });

  it("returns a file whose name the caller can reject, without renaming it", async () => {
    await log(dir, "my log.jsonl", "x", 8000);
    const result = await findLatestLog(projects, cwd);
    assert.ok("name" in result);
    assert.equal(result.name, "my log.jsonl");
    assert.notEqual(validateFileName(result.name), null);
  });
});
