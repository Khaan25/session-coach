import assert from "node:assert/strict";
import { test } from "node:test";
import { isOtpType } from "./otp.ts";

test("accepts the email OTP types Supabase verifies", () => {
  for (const type of ["signup", "invite", "magiclink", "recovery", "email_change", "email"]) {
    assert.equal(isOtpType(type), true, type);
  }
});

test("rejects anything else", () => {
  for (const type of ["", "sms", "Signup", null, undefined, 1]) {
    assert.equal(isOtpType(type), false, String(type));
  }
});
