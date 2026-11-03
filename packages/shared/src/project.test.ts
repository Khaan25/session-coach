import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_QUESTION_LEVEL,
  projectLevelUpdateSchema,
  projectSchema,
  questionLevelSchema,
} from "./project.ts";

const project = {
  id: "2f6c1e1a-0b7e-4c1a-9f3e-8d2b6a1c0e55",
  user_id: "8d2b6a1c-0b7e-4c1a-9f3e-2f6c1e1a0e55",
  repo: "acme/web",
  question_level: "hard",
  onboarded_at: null,
  created_at: "2026-11-04T09:00:00+00:00",
};

test("the three levels match the database check, and the default is simple", () => {
  assert.deepEqual(questionLevelSchema.options, ["simple", "hard", "complex"]);
  assert.equal(DEFAULT_QUESTION_LEVEL, "simple");
  assert.equal(questionLevelSchema.safeParse("easy").success, false);
});

test("a project row parses, with or without onboarded_at", () => {
  projectSchema.parse(project);
  projectSchema.parse({ ...project, onboarded_at: "2026-11-04T09:05:00Z" });
  assert.equal(projectSchema.safeParse({ ...project, repo: "" }).success, false);
});

test("a level update needs a repo and a known level", () => {
  assert.equal(
    projectLevelUpdateSchema.safeParse({ repo: "acme/web", question_level: "complex" }).success,
    true,
  );
  for (const bad of [
    { repo: "", question_level: "simple" },
    { repo: "x".repeat(201), question_level: "simple" },
    { repo: "acme/web", question_level: "medium" },
    { repo: "acme/web" },
  ]) {
    assert.equal(projectLevelUpdateSchema.safeParse(bad).success, false, JSON.stringify(bad));
  }
});
