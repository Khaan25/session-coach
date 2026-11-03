import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { ProjectLevelField } from "@/components/projects/project-level-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import type { ProjectListItem } from "@/lib/projects/queries";

/**
 * How hard the questions are for each repo the learner has sessions in.
 *
 * @param projects - The learner's projects, or null when they couldn't be read.
 */
export function ProjectsCard({ projects }: { projects: ProjectListItem[] | null }) {
  return (
    <Card>
      <CardHeader>
        {/* skullet-own: static text stays real in the settings skeleton. */}
        <CardTitle skullet-own="">
          <h2>Projects</h2>
        </CardTitle>
        <CardDescription skullet-own="">
          How hard the questions are for each repo. Changes apply to new sessions. Existing cards
          keep their questions.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
