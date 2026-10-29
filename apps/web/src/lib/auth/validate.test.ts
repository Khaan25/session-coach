import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MIN_PASSWORD,
  validateNewPassword,
  validateResetRequest,
  validateSignIn,
  validateSignUp,
} from "./validate.ts";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const long = "x".repeat(MIN_PASSWORD);
const short = "x".repeat(MIN_PASSWORD - 1);

test("a valid form has no errors", () => {
  assert.deepEqual(validateSignIn(form({ email: " a@b.co ", password: "x" })), {});
  assert.deepEqual(validateSignUp(form({ email: "a@b.co", password: long })), {});
  assert.deepEqual(validateResetRequest(form({ email: "a@b.co" })), {});
  assert.deepEqual(validateNewPassword(form({ password: long })), {});
});

test("email: missing, blank or malformed", () => {
  assert.equal(validateResetRequest(form({})).email, "Enter your email address.");
  assert.equal(validateResetRequest(form({ email: "   " })).email, "Enter your email address.");
  for (const email of ["a", "a@b", "a b@c.d", "@b.co"])
    assert.equal(
      validateResetRequest(form({ email })).email,
      "Enter an email address like name@example.com.",
    );
});

test("sign-in only needs a password; sign-up and reset need MIN_PASSWORD characters", () => {
  assert.equal(validateSignIn(form({ email: "a@b.co" })).password, "Enter your password.");
  assert.deepEqual(validateSignIn(form({ email: "a@b.co", password: short })), {});
  assert.equal(validateSignUp(form({ email: "a@b.co" })).password, "Enter a password.");
  assert.equal(
    validateSignUp(form({ email: "a@b.co", password: short })).password,
    `Use at least ${MIN_PASSWORD} characters.`,
  );
  assert.equal(validateNewPassword(form({})).password, "Enter a new password.");
  assert.equal(
    validateNewPassword(form({ password: short })).password,
    `Use at least ${MIN_PASSWORD} characters.`,
  );
});

test("reports both fields at once, email first", () => {
  assert.deepEqual(Object.keys(validateSignUp(form({ email: "x", password: "" }))), [
    "email",
    "password",
  ]);
});
