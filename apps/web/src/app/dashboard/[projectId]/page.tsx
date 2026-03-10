import { TaskList } from "@/components/tasks/TaskList";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <TaskList projectId={projectId} />;
}
