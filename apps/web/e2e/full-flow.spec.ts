// The whole learner path on the LOCAL stack, with the real CLI: sign in, `session-coach login` approved in the browser,
// `push` a session, cards made by the fake model, pick the project's question level, answer a card, revoke the device.
// The CLI runs with HOME in a temp folder and a stub `open`, so it never touches the real config or opens a browser.
// Set E2E_SHOTS to a folder to save screenshots for a PR. Creates its own learner and deletes it at the end.

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { localStack } from "../tests/local-stack.ts";

const stack = localStack();
const admin = createClient(stack.url, stack.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Playwright runs from apps/web.
const CLI = resolve("../../packages/cli/src/cli.ts");
const FIXTURE = resolve("src/lib/pipeline/fixtures/session.fake.jsonl");
const REPO = "session-coach";
const email = `e2e-${randomUUID()}@example.test`;
const password = randomUUID();
let userId = "";
let home = "";

test.use({ viewport: { width: 1280, height: 800 }, video: "on" });
test.setTimeout(180_000);

/** Runs the CLI like a learner would, with the temp HOME and the stub opener first on PATH. */
function cli(args: string[], onOutput?: (text: string) => void) {
  return new Promise<{ code: number; out: string }>((done) => {
    const child = spawn(process.execPath, ["--experimental-strip-types", CLI, ...args], {
      env: { ...process.env, HOME: home, PATH: `${join(home, "bin")}:${process.env.PATH}` },
    });
    let out = "";
    const take = (chunk: Buffer) => {
      out += chunk.toString();
      onOutput?.(out);
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    child.on("close", (code) => done({ code: code ?? 1, out }));
  });
}

async function shot(page: Page, name: string) {
  if (process.env.E2E_SHOTS)
    await page.screenshot({ path: join(process.env.E2E_SHOTS, `${name}.png`) });
}

test.beforeAll(async () => {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Sam Rivera" },
  });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  home = await mkdtemp(join(tmpdir(), "sc-e2e-"));
  // A stub `open`, so the CLI's browser launch is a no-op here.
  await mkdir(join(home, "bin"));
  for (const opener of ["open", "xdg-open"]) {
    await writeFile(join(home, "bin", opener), "#!/bin/sh\nexit 0\n");
    await chmod(join(home, "bin", opener), 0o755);
  }
});

test.afterAll(async () => {
  if (userId) await admin.auth.admin.deleteUser(userId);
  if (home) await rm(home, { recursive: true, force: true });
});

test("sign in, log the CLI in from the browser, push, choose a level, answer, revoke", async ({
  page,
  baseURL,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // 1. `session-coach login`: the CLI prints a code and waits; the learner approves it in the browser.
  let code = "";
  const login = cli(["login", "--url", baseURL!], (out) => {
    code ||= /\b([A-Z]{4}-[A-Z]{4})\b/.exec(out)?.[1] ?? "";
  });
  await expect.poll(() => code, { timeout: 30_000 }).not.toBe("");
  await page.goto(`/cli/approve?code=${code}`);
  await expect(page.getByRole("heading", { name: "Approve this CLI login?" })).toBeVisible();
  await shot(page, "1-approve");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("CLI connected")).toBeVisible();
  await shot(page, "2-approved");
  const loggedIn = await login;
  expect(loggedIn.code, loggedIn.out).toBe(0);
  expect(loggedIn.out).toContain(email);
  const config = JSON.parse(await readFile(join(home, ".session-coach", "config.json"), "utf8"));
  expect(config.token).toMatch(/^sc_/);

  // 2. `session-coach push <file>`: the session uploads and the fake model turns it into cards.
  const log = join(home, `${randomUUID()}.jsonl`);
  await copyFile(FIXTURE, log);
  const pushed = await cli(["push", log]);
  expect(pushed.code, pushed.out).toBe(0);
  await expect
    .poll(
      async () =>
        (await admin.from("sessions").select("status").eq("user_id", userId).single()).data?.status,
      { timeout: 60_000 },
    )
    .toBe("ready");
  // The CLI doesn't send a repo yet (Kasam's CLI work), so the test names it the way the CLI will.
  await admin.from("sessions").update({ repo: REPO }).eq("user_id", userId);

  // 3. The dashboard asks how hard the questions should be for this repo, once.
  await page.goto("/dashboard");
  const setup = page
    .locator("div")
    .filter({
      has: page.getByRole("heading", { name: `Set up ${REPO}: how hard should questions be?` }),
    })
    .filter({ has: page.getByRole("button", { name: "Save" }) })
    .last();
  await expect(setup).toBeVisible();
  await setup.getByText("Hard", { exact: true }).click();
  await shot(page, "3-level");
  await setup.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: /Set up session-coach/ })).toHaveCount(0);
  const project = await admin
    .from("projects")
    .select("question_level, onboarded_at")
    .eq("user_id", userId)
    .single();
  expect(project.data?.question_level).toBe("hard");
  expect(project.data?.onboarded_at).not.toBeNull();

  // 4. Answer a card: the why only arrives after the attempt.
  await page.goto("/review");
  await page.getByRole("link", { name: "Start review" }).click();
  const explanation = page.getByLabel("Your explanation");
  // Filled again until it sticks: a fill that lands before hydration is reset by React to the empty state.
  await expect(async () => {
    await explanation.fill("Because it kept the existing pattern.");
    await page.waitForTimeout(300);
    await expect(explanation).toHaveValue("Because it kept the existing pattern.", {
      timeout: 100,
    });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: "Submit answer" }).click();
  await expect(page.getByRole("heading", { name: "Your result" })).toBeVisible();
  await shot(page, "4-answered");
  const answers = await admin.from("answers").select("score").eq("user_id", userId);
  expect(answers.data?.length).toBe(1);

  // 5. The device shows under Connected devices; revoking it signs the CLI out.
  await page.goto("/setup");
  const devices = page.getByRole("heading", { name: "Connected devices" });
  await expect(devices).toBeVisible();
  await devices.scrollIntoViewIfNeeded();
  await shot(page, "5-devices");
  await page
    .getByRole("button", { name: /^Revoke/ })
    .first()
    .click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Revoke" }).click();
  await expect(page.getByText("No computer connected yet")).toBeVisible();
  const me = await fetch(`${baseURL}/api/cli/me`, {
    headers: { authorization: `Bearer ${config.token}` },
  });
  expect(me.status).toBe(401);
});
