import assert from "node:assert/strict";
import { test } from "node:test";

import {
  cronAuthorized,
  dailyReviewCopy,
  type DailyReviewDeps,
  dailyReviewRecipients,
  type NewCardRow,
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
const review = (
  user_id: string,
  due_on: string | null,
  mastered = false,
  decision = `${user_id} decision due ${due_on}`,
): ReviewRow => ({ user_id, due_on, mastered, decision });
const newCard = (
  user_id: string,
  created_at: string,
  decision = `${user_id} new ${created_at}`,
): NewCardRow => ({
  user_id,
  decision,
  created_at,
});

/** The words without the template: the route renders React Email, which node --test can't load. */
const compose: Parameters<typeof sendDailyReviews>[1] = async (recipient) => {
  const { subject, text } = dailyReviewCopy(recipient, site);
  return { subject, text, html: `<p>${text}</p>` };
};

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
    [],
    now,
  );
  assert.deepEqual(recipients, []);
  const { deps, outbox } = fakeDeps();
  assert.deepEqual(await sendDailyReviews(recipients, compose, deps), {
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
    [],
    now,
  );
  assert.deepEqual(recipients, [
    {
      userId: "a",
      email: "a@example.test",
      today: "2026-10-31",
      // Oldest due first.
      due: ["a decision due 2026-10-20", "a decision due 2026-10-31"],
      fresh: [],
      answered: 4,
      mastered: 1,
    },
  ]);
});

test("notify_email = false and a missing address are skipped", () => {
  const off = profile("off", "UTC", false);
  const noEmail = { ...profile("none"), email: null };
  const reviews = [review("off", "2026-10-31"), review("none", "2026-10-31")];
  assert.deepEqual(dailyReviewRecipients([off, noEmail], reviews, [], now), []);
});

test("due today is evaluated in the learner's time zone", () => {
  const reviews = [review("karachi", "2026-11-01"), review("bogota", "2026-11-01")];
  const recipients = dailyReviewRecipients(
    [profile("karachi", "Asia/Karachi"), profile("bogota", "America/Bogota")],
    reviews,
    [],
    now,
  );
  // Due Nov 1: Karachi is past midnight, Bogotá is not.
  assert.deepEqual(
    recipients.map(({ userId, today }) => [userId, today]),
    [["karachi", "2026-11-01"]],
  );
});

test("a rerun the same day sends nothing twice", async () => {
  const recipients = dailyReviewRecipients([profile("a")], [review("a", "2026-10-31")], [], now);
  const { deps, log, outbox } = fakeDeps();
  assert.deepEqual(await sendDailyReviews(recipients, compose, deps), {
    sent: 1,
    skipped: 0,
    failed: 0,
  });
  assert.deepEqual(await sendDailyReviews(recipients, compose, deps), {
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
    [],
    now,
  );
  const { deps, log, outbox } = fakeDeps();
  const send = deps.send;
  deps.send = async (email) => {
    if (email.to.startsWith("b@")) throw new Error("Resend responded 500");
    return send(email);
  };
  assert.deepEqual(await sendDailyReviews(recipients, compose, deps), {
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

test("new cards from the last 7 days count, older ones stop", () => {
  const recipients = dailyReviewRecipients(
    [profile("a"), profile("old")],
    [],
    [
      newCard("a", "2026-10-30T10:00:00Z"),
      newCard("a", "2026-10-25T10:00:00Z"),
      // 8 days before `now`: past the window, so ignored reminders end.
      newCard("old", "2026-10-23T20:00:00Z"),
    ],
    now,
  );
  assert.deepEqual(recipients, [
    {
      userId: "a",
      email: "a@example.test",
      today: "2026-10-31",
      due: [],
      fresh: ["a new 2026-10-25T10:00:00Z", "a new 2026-10-30T10:00:00Z"],
      answered: 0,
      mastered: 0,
    },
  ]);
});

test("the email says what's new and due, lists 3, and links review and settings", () => {
  const copy = dailyReviewCopy(
    {
      due: ["Due one", "Due two"],
      fresh: ["New one", "New two", "New three"],
      answered: 18,
      mastered: 6,
    },
    site,
  );
  assert.equal(copy.subject, "5 cards to review today");
  assert.equal(copy.heading, "5 decisions to explain today");
  assert.equal(copy.summary, "3 new from your sessions · 2 due again");
  assert.deepEqual(copy.cards, [
    { title: "Due one", tag: "Due" },
    { title: "Due two", tag: "Due" },
    { title: "New one", tag: "New" },
  ]);
  assert.equal(copy.more, "and 2 more");
  assert.equal(copy.progress, "18 cards answered so far, 6 mastered.");
  assert.equal(copy.reviewUrl, `${site}/review`);
  assert.equal(copy.settingsUrl, `${site}/settings`);
  for (const line of ["- Due one (Due)", "and 2 more", `${site}/review`, `${site}/settings`]) {
    assert.ok(copy.text.includes(line), line);
  }
});

test("one new card on a first session reads in the singular, with a first-time line", () => {
  const copy = dailyReviewCopy(
    { due: [], fresh: ["x".repeat(120)], answered: 0, mastered: 0 },
    site,
  );
  assert.equal(copy.subject, "1 card to review today");
  assert.equal(copy.heading, "1 decision to explain today");
  assert.equal(copy.summary, "1 new from your sessions");
  assert.equal(copy.more, null);
  assert.match(copy.progress, /first cards/);
  // Long decisions are cut for the list.
  assert.equal(copy.cards[0].title.length, 90);
  assert.ok(copy.cards[0].title.endsWith("…"));
});

test("a template error leaves the day unclaimed, so a rerun can still send", async (t) => {
  t.mock.method(console, "error", () => {});
  const recipients = dailyReviewRecipients([profile("a")], [review("a", "2026-10-31")], [], now);
  const { deps, log, outbox } = fakeDeps();
  const broken: typeof compose = async () => {
    throw new Error("render failed");
  };
  assert.deepEqual(await sendDailyReviews(recipients, broken, deps), {
    sent: 0,
    skipped: 0,
    failed: 1,
  });
  assert.equal(log.has("a/2026-10-31"), false);
  assert.deepEqual(await sendDailyReviews(recipients, compose, deps), {
    sent: 1,
    skipped: 0,
    failed: 0,
  });
  assert.equal(outbox.length, 1);
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

test("a long title is cut by character, never through an emoji", () => {
  const title = `${"x".repeat(88)}😀 and the rest of a long decision`;
  const [card] = dailyReviewCopy({ due: [title], fresh: [], answered: 1, mastered: 0 }, site).cards;
  assert.equal([...card.title].length, 90);
  assert.ok(card.title.includes("😀"));
  assert.doesNotMatch(card.title, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
});
