import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { Container } from "@/components/app/container";
import { ProjectTabs } from "@/components/app/project-tabs";
import { OwnershipSummary, OwnershipPath } from "@/components/progress/ownership-visuals";
import { AnswersChart } from "@/components/progress/answers-chart";
import { Collapsible, CollapsibleContent, CollapsibleRow } from "@/components/ui/collapsible";
import type { CardPath } from "@/lib/progress/card-path";
import type { Ownership } from "@/lib/progress/ownership";
import type { Progress as ProgressData } from "@/lib/progress/progress";
import { projectScope, projectLabel } from "@/lib/projects/scope";
export type ProgressPageData = {
  progress: ProgressData;
  ownership: Ownership;
  dueToday: number;
  dueOnDay11: number;
  path: CardPath | null;
  repo: string | null;
  repos: string[] | null;
};
export const progressHref = (repo: string | null) =>
  repo ? `/progress?${new URLSearchParams({ repo })}` : "/progress";
export function ProgressEmpty({ empty }: { empty: React.ReactNode }) {
  return (
    <Container>
      <header className="studio-page-heading">
        <p className="studio-eyebrow">YOUR UNDERSTANDING, OVER TIME</p>
        <h1>Your progress starts with a decision.</h1>
      </header>
      {empty}
    </Container>
  );
}
export function ProgressSummary({ data }: { data: ProgressPageData }) {
  const { progress, repo, repos, path, dueToday } = data;
  const projects = repo ? progress.byProject.filter((p) => p.repo === repo) : progress.byProject;
  const body = (
    <>
      <AnswersChart data={progress.answersPerDay} />
      <OwnershipSummary progress={progress} scope={repo ? projectScope(repo) : "all"} />
      {dueToday > 0 && (
        <Link
          className="studio-quiet-review-link"
          href={repo ? `/review?${new URLSearchParams({ repo })}` : "/review"}
        >
          {dueToday} {dueToday === 1 ? "decision is" : "decisions are"} ready to review{" "}
          <ArrowRightIcon aria-hidden />
        </Link>
      )}
      <div className="learning-project-progress-list">
        {projects.map((p) => (
          <section className="learning-project-progress" key={p.scope}>
            {!repo && (
              <>
                <div className="project-progress-intro">
                  <h2>{projectLabel(p.scope)}</h2>
                  <p>
                    <strong>
                      {p.steps.mastered} of {p.totalCards} owned
                    </strong>
                    <span>
                      {p.explained} explained · {p.defended} defended
                    </span>
                  </p>
                </div>
              </>
            )}
            <OwnershipPath steps={p.steps} />
            <Link href={p.repo ? `/sessions?repo=${encodeURIComponent(p.repo)}` : "/sessions"}>
              Sessions in {projectLabel(p.scope)} <ArrowRightIcon aria-hidden />
            </Link>
          </section>
        ))}
      </div>
      {path && (
        <Collapsible>
          <CollapsibleRow>Follow one of your decisions</CollapsibleRow>
          <CollapsibleContent>
            <section className="studio-card-history">
              <h2>{path.decision}</h2>
              <p>{path.session}</p>
              <ol>
                {path.stops.map((stop, i) => (
                  <li key={`${stop.date}-${i}`}>
                    <span className="studio-path-stop">
                      <strong>{stop.step}</strong>
                      <span>{stop.date}</span>
                    </span>
                    <div>
                      <h3>{stop.what}</h3>
                      <p>{stop.outcome}</p>
                    </div>
                  </li>
                ))}
                {path.next && (
                  <li>
                    <span className="studio-path-stop">
                      <strong>Next review</strong>
                      <span>{path.next.date}</span>
                    </span>
                    <div>
                      <h3>{path.next.what}</h3>
                      <p>{path.next.outcome}</p>
                    </div>
                  </li>
                )}
              </ol>
            </section>
          </CollapsibleContent>
        </Collapsible>
      )}
      <Collapsible>
        <CollapsibleRow>Practice details</CollapsibleRow>
        <CollapsibleContent>
          <div className="learning-disclosure-body">
            <p>
              {Object.entries(progress.scoreMix)
                .map(
                  ([score, count]) =>
                    `${count} ${score === "2" ? "Got it" : score === "1" ? "Half there" : "Not yet"}`,
                )
                .join(" · ")}
            </p>
            <ul className="studio-session-ownership">
              {progress.bySession.map((s) => (
                <li key={s.id}>
                  <Link href={`/s/${s.id}`}>{s.title}</Link>
                  <span>
                    {s.mastered} of {s.total} owned
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
      <p className="learning-footnote">
        Owned means a correct day 11 review and is included in explained; defenses are counted
        separately.
      </p>
    </>
  );
  return (
    <Container className="learning-progress-page">
      {repos?.length ? (
        <ProjectTabs
          tabs={[null, ...repos].map((name) => ({ repo: name, href: progressHref(name) }))}
          repo={repo}
        >
          {body}
        </ProjectTabs>
      ) : (
        body
      )}
    </Container>
  );
}
