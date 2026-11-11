import assert from "node:assert/strict";
import { test } from "node:test";

import { profileUpdateSchema } from "./profile.ts";

test("the reminder switch's save is valid on its own and changes nothing else", () => {
  // Settings saves the switch on flip with only this field; a default here would overwrite the name or time zone.
  assert.deepEqual(profileUpdateSchema.parse({ notify_email: false }), { notify_email: false });
  assert.deepEqual(profileUpdateSchema.parse({ display_name: "Zia", timezone: "UTC" }), {
    display_name: "Zia",
    timezone: "UTC",
  });
});
