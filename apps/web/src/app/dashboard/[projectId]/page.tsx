import { ProjectPageClient } from "./ProjectPageClient";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectPageClient projectId={projectId} />;
}
