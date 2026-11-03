import { z } from "zod";

/**
 * How hard a project's questions are. simple: one-step "why did we do X". hard: the trade-off, the rejected
 * alternative, what breaks if changed. complex: reasoning across two decisions or a new scenario.
 */
export const questionLevelSchema = z.enum(["simple", "hard", "complex"]);

/** The level a session gets when its repo has no project row, or it has no repo. */
export const DEFAULT_QUESTION_LEVEL: QuestionLevel = "simple";

/** One learner's settings for one repo. `repo` matches `sessions.repo` exactly; sessions with no repo have no project. */
export const projectSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  repo: z.string().min(1),
  question_level: questionLevelSchema,
  /** When the learner last chose a level (or "Not now"); null until the first choice. */
  onboarded_at: z.iso.datetime({ offset: true }).nullable(),
  created_at: z.iso.datetime({ offset: true }),
});

/** What a learner sends to set a project's level. The server sets user_id from the session, never from this. */
export const projectLevelUpdateSchema = z.object({
  repo: z.string().min(1).max(200),
  question_level: questionLevelSchema,
});

export type QuestionLevel = z.infer<typeof questionLevelSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ProjectLevelUpdate = z.infer<typeof projectLevelUpdateSchema>;
