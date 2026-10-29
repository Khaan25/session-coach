import assert from "node:assert/strict";
import { test } from "node:test";
import { productionEnvProblems } from "./production-env.ts";

const good = {
  VERCEL_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://coach.example.org",
  NEXT_PUBLIC_SUPPORT_EMAIL: "help@coach.example.org",
};

test("passes a production build with real values", () => {
  assert.deepEqual(productionEnvProblems(good), []);
});

test("ignores local and preview builds", () => {
  assert.deepEqual(productionEnvProblems({}), []);
  assert.deepEqual(productionEnvProblems({ VERCEL_ENV: "preview" }), []);
});

test("flags a missing site URL", () => {
  assert.equal(productionEnvProblems({ ...good, NEXT_PUBLIC_SITE_URL: "" }).length, 1);
  assert.equal(productionEnvProblems({ ...good, NEXT_PUBLIC_SITE_URL: undefined }).length, 1);
});

test("flags a missing or example support address", () => {
  for (const email of [undefined, "", " ", "support@example.com", "Help@Example.com"]) {
    assert.equal(
      productionEnvProblems({ ...good, NEXT_PUBLIC_SUPPORT_EMAIL: email }).length,
      1,
      String(email),
    );
  }
});
