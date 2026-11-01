import assert from "node:assert/strict";
import { test } from "node:test";

import {
  cronAuthorized,
  dailyReviewEmail,
  type DailyReviewDeps,
  dailyReviewRecipients,
  type OutgoingEmail,
  type ProfileRow,
  type ReviewRow,
  sendDailyReviews,
} from "./daily-review.ts";

const site = "https://coach.example.test";
// 21:00 UTC on Oct 31: already Nov 1 in Karachi (UTC+5), still Oct 31 in Bogotá (UTC-5).
const now = new Date("2026-10-31T21:00:00Z");

const profile = (id: string, timezone = "UTC", notify_email = true): ProfileRow => ({
  id,
  email: `${id}@example.test`,
  timezone,
  notify_email,
});
const review = (user_id: string, due_on: string | null, mastered = false): ReviewRow => ({
  user_id,
  due_on,
  mastered,
});

/** In-memory `email_log` and outbox, so reruns behave like the real unique key. */
function fakeDeps() {
  const log = new Map<string, string | null>();
  const outbox: OutgoingEmail[] = [];
  const deps: DailyReviewDeps = {
    async claim(userId, sentOn) {
      const key = `${userId}/${sentOn}`;
      if (log.has(key)) return false;
      log.set(key, null);
      return true;
    },
    async send(email) {
      outbox.push(email);
      return `re_${outbox.length}`;
    },
    async record(userId, sentOn, resendId) {
      log.set(`${userId}/${sentOn}`, resendId);
    },
  };
  return { deps, log, outbox };
}

test("nothing due means no recipient and no send", async () => {
  const recipients = dailyReviewRecipients(
    [profile("a"), profile("b")],
    [review("a", "2026-11-02"), review("b", null, true)],
    now,
  );
  assert.deepEqual(recipients, []);
  const { deps, outbox } = fakeDeps();
  assert.deepEqual(await sendDailyReviews(recipients, site, deps), {
    sent: 0,
    skipped: 0,
    failed: 0,
  });
  assert.equal(outbox.length, 0);
});

test("counts due and overdue cards, not mastered or future ones", () => {
  const recipients = dailyReviewRecipients(
    [profile("a")],
    [
      review("a", "2026-10-31"),
      review("a", "2026-10-20"),
      review("a", "2026-11-01"),
      review("a", null, true),
      review("other", "2026-10-31"),
    ],
    now,
  );
  assert.deepEqual(recipients, [
    { userId: "a", email: "a@example.test", today: "2026-10-31", count: 2 },
  ]);
});

test("notify_email = false and a missing address are skipped", () => {
  const off = profile("off", "UTC", false);
  const noEmail = { ...profile("none"), email: null };
  const reviews = [review("off", "2026-10-31"), review("none", "2026-10-31")];
  assert.deepEqual(dailyReviewRecipients([off, noEmail], reviews, now), []);
});

test("due today is evaluated in the learner's time zone", () => {
  const reviews = [review("karachi", "2026-11-01"), review("bogota", "2026-11-01")];
  const recipients = dailyReviewRecipients(
    [profile("karachi", "Asia/Karachi"), profile("bogota", "America/Bogota")],
    reviews,
    now,
  );
  // Due Nov 1: Karachi is past midnight, Bogotá is not.
  assert.deepEqual(
    recipients.map(({ userId, today }) => [userId, today]),
    [["karachi", "2026-11-01"]],
  );
});

test("a rerun the same day sends nothing twice", async () => {
  const recipients = dailyReviewRecipients([profile("a")], [review("a", "2026-10-31")], now);
  const { deps, log, outbox } = fakeDeps();
  assert.deepEqual(await sendDailyReviews(recipients, site, deps), {
    sent: 1,
    skipped: 0,
    failed: 0,
  });
  assert.deepEqual(await sendDailyReviews(recipients, site, deps), {
    sent: 0,
    skipped: 1,
    failed: 0,
  });
  assert.equal(outbox.length, 1);
  assert.equal(log.get("a/2026-10-31"), "re_1");
  assert.equal(outbox[0].idempotencyKey, "daily_review/a/2026-10-31");
});

test("one learner's failure doesn't stop the others", async (t) => {
  t.mock.method(console, "error", () => {});
  const recipients = dailyReviewRecipients(
    [profile("a"), profile("b"), profile("c")],
    ["a", "b", "c"].map((id) => review(id, "2026-10-31")),
    now,
  );
  const { deps, log, outbox } = fakeDeps();
  const send = deps.send;
  deps.send = async (email) => {
    if (email.to.startsWith("b@")) throw new Error("Resend responded 500");
    return send(email);
  };
  assert.deepEqual(await sendDailyReviews(recipients, site, deps), {
    sent: 2,
    skipped: 0,
    failed: 1,
  });
  assert.deepEqual(
    outbox.map(({ to }) => to),
    ["a@example.test", "c@example.test"],
  );
  // The failed learner's claim stays, with no message id: no retry until tomorrow.
  assert.equal(log.has("b/2026-10-31"), true);
  assert.equal(log.get("b/2026-10-31"), null);
});

test("the email has the count, the review link and how to turn it off", () => {
  const email = dailyReviewEmail(3, site);
  assert.equal(email.subject, "3 cards to review today");
  assert.equal(dailyReviewEmail(1, site).subject, "1 card to review today");
  for (const body of [email.text, email.html]) {
    assert.match(body, /3 cards due/);
    assert.ok(body.includes(`${site}/review`));
    assert.ok(body.includes(`${site}/settings`));
  }
});

test("cron auth needs the exact bearer secret", () => {
  assert.equal(cronAuthorized("Bearer s3cret", "s3cret"), true);
  assert.equal(cronAuthorized("Bearer wrong", "s3cret"), false);
  assert.equal(cronAuthorized("s3cret", "s3cret"), false);
  assert.equal(cronAuthorized(null, "s3cret"), false);
  // An unset secret lets nobody in, not even an empty bearer.
  assert.equal(cronAuthorized("Bearer ", undefined), false);
  assert.equal(cronAuthorized("Bearer ", ""), false);
});
