// The public ownership report (/r/[slug], GET /api/report/[slug]), shaped from rows the server read with the service
// role. Pure, so the test can prove what never leaves: the why, model_answer, the learner's answers, hidden and
// flagged cards, and repos the learner didn't tick. Each output field is picked by name; nothing is spread from a row.

/** One owned card on the page. Dates are ISO timestamps. */
export type ReportDecision = {
  decision: string;
  /** The first verified evidence quote, from the learner's own redacted session log. */
  quote: string;
  file: string | null;
  ownedOn: string;
  /** The latest finished defense scored 2, or null. */
  defendedOn: string | null;
};

export type ReportRepo = {
  repo: string;
  owned: number;
  defended: number;
  decisions: ReportDecision[];
};

/** The body of `GET /api/report/[slug]` when the report is on. */
export type Report = {
  name: string | null;
  owned: number;
  defended: number;
  repos: ReportRepo[];
};

/** A mastered review with its card, as `getReport` reads it. Extra columns are ignored. */
export type OwnedRow = {
  card_id: string;
  /** `reviews.updated_at`: a mastered row is last written when it was mastered. */
  updated_at: string;
  card: {
    decision: string;
    evidence: unknown;
    files: string[] | null;
    hidden: boolean;
    flagged: boolean;
    session: { repo: string | null } | null;
  } | null;
};

/** A finished defense scored 2. */
export type DefenseRow = { card_id: string; finished_at: string | null };

type EvidenceItem = { quote?: unknown; file?: unknown; verified?: unknown };

/** The first verified quote and its file, or null when there is none. */
function verifiedQuote(evidence: unknown): { quote: string; file: string | null } | null {
  if (!Array.isArray(evidence)) return null;
  const item = (evidence as EvidenceItem[]).find(
    (e) => e?.verified === true && typeof e.quote === "string" && e.quote.length > 0,
  );
  if (!item) return null;
  return { quote: item.quote as string, file: typeof item.file === "string" ? item.file : null };
}

/**
 * Builds the report: owned cards (mastered) in the repos the learner ticked, never hidden or flagged, grouped by repo.
 * Defended counts the owned cards on the page with a finished defense scored 2.
 *
 * @param name - `profiles.display_name`.
 * @param shownRepos - Repos with `projects.report_shown`.
 * @param owned - Mastered reviews with their cards.
 * @param defenses - Finished defenses scored 2.
 */
export function shapeReport(
  name: string | null,
  shownRepos: readonly string[],
  owned: readonly OwnedRow[],
  defenses: readonly DefenseRow[],
): Report {
  const shown = new Set(shownRepos);
  const defendedOn = new Map<string, string>();
  for (const { card_id, finished_at } of defenses) {
    if (!finished_at) continue;
    const seen = defendedOn.get(card_id);
    if (!seen || finished_at > seen) defendedOn.set(card_id, finished_at);
  }

  const byRepo = new Map<string, ReportDecision[]>();
  for (const row of owned) {
    const card = row.card;
    const repo = card?.session?.repo;
    if (!card || card.hidden || card.flagged || !repo || !shown.has(repo)) continue;
    const evidence = verifiedQuote(card.evidence);
    if (!evidence) continue;
    const decisions = byRepo.get(repo) ?? [];
    decisions.push({
      decision: card.decision,
      quote: evidence.quote,
      file: evidence.file ?? card.files?.[0] ?? null,
      ownedOn: row.updated_at,
      defendedOn: defendedOn.get(row.card_id) ?? null,
    });
    byRepo.set(repo, decisions);
  }

  const repos = [...byRepo]
    .map(([repo, decisions]) => ({
      repo,
      owned: decisions.length,
      defended: decisions.filter((d) => d.defendedOn).length,
      // Newest first.
      decisions: decisions.sort((a, b) => b.ownedOn.localeCompare(a.ownedOn)),
    }))
    .sort((a, b) => b.owned - a.owned || a.repo.localeCompare(b.repo));

  return {
    name,
    owned: repos.reduce((sum, r) => sum + r.owned, 0),
    defended: repos.reduce((sum, r) => sum + r.defended, 0),
    repos,
  };
}
