import assert from "node:assert/strict";
import { test } from "node:test";

import { accountStoragePaths } from "./account-storage.ts";

test("accountStoragePaths joins session paths and listed files, once each, without folders", () => {
  const paths = accountStoragePaths(
    "u1",
    ["u1/s1.jsonl.gz", "u1/s2.jsonl.gz"],
    [
      { name: "s1.jsonl.gz", id: "o1" },
      { name: "orphan.jsonl.gz", id: "o3" },
      { name: "nested", id: null },
    ],
  );
  assert.deepEqual(paths, ["u1/s1.jsonl.gz", "u1/s2.jsonl.gz", "u1/orphan.jsonl.gz"]);
});

test("accountStoragePaths returns nothing for a learner with no uploads", () => {
  assert.deepEqual(accountStoragePaths("u1", [], []), []);
});

test("accountStoragePaths drops raw paths outside the learner's folder", () => {
  assert.deepEqual(
    accountStoragePaths("u1", ["u2/s9.jsonl.gz", "u1/s1.jsonl.gz", "s3.jsonl.gz"], []),
    ["u1/s1.jsonl.gz"],
  );
});
