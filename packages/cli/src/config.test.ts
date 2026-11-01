import assert from "node:assert/strict";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { configPath, loadConfig, normalizeUrl, saveConfig, validateToken } from "./config.ts";

describe("validateToken", () => {
  it("accepts sc_ tokens", () => {
    assert.equal(validateToken("sc_abc123"), null);
  });

  it("rejects other prefixes, a bare prefix and empty input", () => {
    for (const bad of ["abc123", "sk_abc", "sc_", ""]) {
      assert.match(validateToken(bad) ?? "", /sc_/);
    }
  });
});

describe("normalizeUrl", () => {
  it("strips trailing slashes and keeps the origin", () => {
    assert.equal(normalizeUrl("https://coach.ziaa.me/"), "https://coach.ziaa.me");
    assert.equal(normalizeUrl("http://localhost:3000"), "http://localhost:3000");
  });

  it("rejects non-http URLs and garbage", () => {
    assert.equal(normalizeUrl("ftp://x.test"), null);
    assert.equal(normalizeUrl("not a url"), null);
    assert.equal(normalizeUrl(""), null);
  });
});

describe("config file", () => {
  it("lives under ~/.session-coach", () => {
    assert.equal(configPath("/home/me"), "/home/me/.session-coach/config.json");
  });

  it("round-trips and is readable by its owner only, even over a looser existing file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sc-cli-"));
    try {
      const path = configPath(dir);
      await saveConfig(path, { token: "sc_x", url: "https://app.test" });
      await writeFile(path, "{}", { mode: 0o644 });
      await saveConfig(path, { token: "sc_x", url: "https://app.test" });

      assert.equal((await stat(path)).mode & 0o777, 0o600);
      assert.deepEqual(await loadConfig(path), { token: "sc_x", url: "https://app.test" });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns null when the file is missing or malformed", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sc-cli-"));
    try {
      assert.equal(await loadConfig(join(dir, "nope.json")), null);
      const path = join(dir, "bad.json");
      await writeFile(path, "{not json");
      assert.equal(await loadConfig(path), null);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
