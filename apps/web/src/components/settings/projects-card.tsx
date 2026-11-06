import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { ProjectLevelField } from "@/components/projects/project-level-field";
import { ChecklistStep } from "@/components/settings/checklist-step";
import { FieldGroup } from "@/components/ui/field";
import type { ProjectListItem } from "@/lib/projects/queries";

/**
 * Step 4 of the settings checklist: how hard the questions are for each repo the learner has sessions in. Check this
 * while a repo has no level chosen yet (the dashboard's setup card); no badge when there is nothing to judge.
 *
 * @param projects - The learner's projects, or null when they couldn't be read.
 */
export function ProjectsCard({ projects }: { projects: ProjectListItem[] | null }) {
  return (
    <ChecklistStep
      n={4}
      title="Question level per project"
      changes="Applies to sessions processed after the change. Cards you already have keep their questions."
      done={projects?.length ? projects.every((project) => project.onboarded) : undefined}
    >
      {projects === null ? (
        <ErrorState
          variant="plain"
          title="Couldn't load your projects"
          message="Reload the page to try again."
        />
      ) : projects.length === 0 ? (
        <EmptyState
          variant="plain"
          title="No projects yet"
          description="A repo shows up here after you upload a session from it."
        />
      ) : (
        <FieldGroup>
          {projects.map((project) => (
            <ProjectLevelField
              key={project.repo}
              repo={project.repo}
              level={project.question_level}
            />
          ))}
        </FieldGroup>
      )}
    </ChecklistStep>
  );
}
