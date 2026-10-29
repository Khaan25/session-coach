import assert from "node:assert/strict";
import { test } from "node:test";

import { sessionName } from "./name.ts";

test("sessionName prefers the title, then repo and branch, then a fallback", () => {
  assert.equal(sessionName({ title: "Write parser", repo: "r", branch: "b" }), "Write parser");
  assert.equal(
    sessionName({ title: null, repo: "rapporteur", branch: "main" }),
    "rapporteur on main",
  );
  assert.equal(sessionName({ title: "", repo: "rapporteur", branch: null }), "rapporteur");
  assert.equal(sessionName({}), "Untitled session");
});
