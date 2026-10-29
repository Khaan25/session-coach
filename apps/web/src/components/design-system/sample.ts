import sample from "@session-coach/shared/fixtures/session.sample.json";

// The gallery's only example data: the shared sample session and its decision cards. Hidden cards are left out,
// as a learner never sees them.
const session = sample.session;
const cards = sample.cards.filter((card) => !card.hidden);

// The loop: a session ends, 3 to 5 decision cards are written, and the learner explains each back on these days.
const REVIEW_DAYS = [1, 3, 7] as const;

export { cards, REVIEW_DAYS, session };
