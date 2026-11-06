import Link from "next/link";
import { OwnershipRing } from "@/components/art/engineering-illustrations";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import type { ProgressSummary, ProjectProgress } from "@/lib/progress/progress";
import { projectHref, projectLabel, type ProjectScope } from "@/lib/projects/scope";

export function ProjectOwnershipList({ projects }: { projects: ProjectProgress[] }) {
  return (
    <section className="learning-projects" aria-labelledby="learning-projects-heading">
      <h2 id="learning-projects-heading">Your projects</h2>
      {projects.map((p) => (
        <Link
          key={p.scope}
          href={projectHref("/progress", p.scope)}
          className="learning-project-row"
          aria-label={"View progress for " + projectLabel(p.scope)}
        >
          <OwnershipRing
            owned={p.steps.mastered}
            total={p.totalCards}
            size="project"
            identity={p.scope}
          />
          <div className="coach-project-details">
            <div className="learning-project-summary">
              <h3>{projectLabel(p.scope)}</h3>
              <span>
                {p.explained} explained · {p.steps.mastered} of {p.totalCards} owned
              </span>
              <ArrowRightIcon aria-hidden />
            </div>
            <svg
              viewBox="0 0 100 3"
              preserveAspectRatio="none"
              aria-hidden
              className="learning-project-bar"
            >
              <path className="learning-bar-track" d="M0 1.5H100" />
              <path
                className="learning-bar-explained"
                d="M0 1.5H100"
                pathLength="100"
                strokeDasharray={(p.totalCards ? (p.explained / p.totalCards) * 100 : 0) + " 100"}
              />
              <path
                className="learning-bar-owned"
                d="M0 1.5H100"
                pathLength="100"
                strokeDasharray={
                  (p.totalCards ? (p.steps.mastered / p.totalCards) * 100 : 0) + " 100"
                }
              />
            </svg>
          </div>
        </Link>
      ))}
    </section>
  );
}

export function OwnershipSummary({
  progress,
  scope,
}: {
  progress: ProgressSummary;
  scope: ProjectScope;
}) {
  return (
    <section className="learning-ownership-summary">
      <div>
        <span className="coach-kicker">Your progress</span>
        <h1>
          You own {progress.steps.mastered} of {progress.totalCards} decisions
          {scope === "all" ? "." : " in " + projectLabel(scope) + "."}
        </h1>
        <p>
          {progress.explained} explained · {progress.defended} defended
        </p>
      </div>
      <OwnershipRing owned={progress.steps.mastered} total={progress.totalCards} />
    </section>
  );
}

const stages = [
  ["new", "New", "First explanation"],
  ["day-1", "Day 1", "First return"],
  ["day-4", "Day 4", "Recall it again"],
  ["day-11", "Day 11", "Final review"],
  ["mastered", "Owned", "Day 11, correct"],
] as const;

export function OwnershipPath({ steps }: { steps: ProgressSummary["steps"] }) {
  const total = stages.reduce((sum, [key]) => sum + steps[key], 0);
  const segments = stages.map(([key], index) => ({
    key,
    length: total ? (steps[key] / total) * 100 : 0,
    offset: total
      ? (stages.slice(0, index).reduce((sum, [previous]) => sum + steps[previous], 0) / total) * 100
      : 0,
  }));
  return (
    <div className="ownership-distribution">
      <p className="ownership-track-caption">Where your decisions are now</p>
      <svg
        className="ownership-ribbon"
        viewBox="0 0 1000 36"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="ownership-ribbon-base" d="M16 18H984" />
        {segments
          .filter(({ length }) => length > 0)
          .map(({ key, length, offset: start }) => (
            <path
              key={key}
              className="ownership-ribbon-segment"
              data-stage={key}
              d="M16 18H984"
              pathLength="100"
              strokeDasharray={`${length} ${100 - length}`}
              strokeDashoffset={-start}
            />
          ))}
      </svg>
      <ol className="ownership-stages" aria-label="Decisions at each review stage">
        {stages.map(([key, label, hint]) => (
          <li
            key={key}
            data-review-stage={key}
            data-has-decisions={steps[key] > 0 ? "true" : "false"}
          >
            <span className="ownership-stage-label">{label}</span>
            <strong>
              {steps[key]}
              <span className="sr-only"> {steps[key] === 1 ? "decision" : "decisions"}</span>
            </strong>
            <span className="ownership-stage-hint">{hint}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
