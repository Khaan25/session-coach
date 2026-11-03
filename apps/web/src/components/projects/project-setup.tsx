import { Suspense } from "react";

import { getCurrentUser } from "@/lib/auth/current-user";
import { listProjects } from "@/lib/projects/queries";

import { ProjectSetupCard } from "./project-setup-card";

/** One setup card per repo the learner hasn't chosen a question level for. Nothing while loading or when all are set. */
export function ProjectSetup() {
  return (
    <Suspense fallback={null}>
      <SetupCards />
    </Suspense>
  );
}

async function SetupCards() {
  const user = await getCurrentUser();
  if (!user) return null;
  let projects: Awaited<ReturnType<typeof listProjects>>;
  try {
    projects = await listProjects(user.id);
  } catch (error) {
    // An optional prompt: a failed read must not take the dashboard down. Settings shows the error.
    console.error("[projects/ProjectSetup]", error);
    return null;
  }
  return projects
    .filter((project) => !project.onboarded)
    .map((project) => <ProjectSetupCard key={project.repo} repo={project.repo} />);
}
