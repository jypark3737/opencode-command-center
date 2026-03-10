"use client";

import { useCallback } from "react";
import { trpcReact } from "@/lib/trpc-client";
import { useSSE } from "@/hooks/useSSE";
import { TaskCard } from "./TaskCard";
import { TaskCreateForm } from "./TaskCreateForm";
import type { DashboardEvent } from "@opencode-cc/shared";
import type { TaskStatus } from "@opencode-cc/shared";

interface TaskListProps {
  projectId: string;
}

export function TaskList({ projectId }: TaskListProps) {
  const utils = trpcReact.useUtils();

  const { data: tasks, isLoading } = trpcReact.tasks.listByProject.useQuery(
    { projectId },
    { refetchInterval: false }
  );

  const createTask = trpcReact.tasks.create.useMutation({
    onSuccess: () => utils.tasks.listByProject.invalidate({ projectId }),
  });

  const requestReview = trpcReact.admin.reviewTask.useMutation({
    onSuccess: () => utils.tasks.listByProject.invalidate({ projectId }),
  });

  // Real-time updates via SSE
  useSSE(
    useCallback(
      (event: DashboardEvent) => {
        if (
          event.type === "task_status_changed" &&
          event.projectId === projectId
        ) {
          utils.tasks.listByProject.invalidate({ projectId });
        } else if (
          event.type === "task_completed" &&
          event.projectId === projectId
        ) {
          utils.tasks.listByProject.invalidate({ projectId });
        } else if (
          event.type === "task_failed" &&
          event.projectId === projectId
        ) {
          utils.tasks.listByProject.invalidate({ projectId });
        } else if (event.type === "subtodos_updated") {
          utils.tasks.listByProject.invalidate({ projectId });
        }
      },
      [projectId, utils]
    )
  );

  async function handleCreateTask(title: string, description: string) {
    await createTask.mutateAsync({ projectId, title, description });
  }

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#555", fontSize: 13 }}>Loading tasks...</div>
      </div>
    );
  }

  const taskList = tasks ?? [];

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#fff" }}>
            Tasks
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#555" }}>
            {taskList.length} task{taskList.length !== 1 ? "s" : ""}
            {taskList.filter((t) => t.status === "RUNNING").length > 0 && (
              <span style={{ color: "#6366f1", marginLeft: 8 }}>
                · {taskList.filter((t) => t.status === "RUNNING").length} running
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Task list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {taskList.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "#555",
              fontSize: 13,
              border: "1px dashed #2a2a2a",
              borderRadius: 8,
            }}
          >
            No tasks yet. Add one below.
          </div>
        ) : (
          taskList.map((task) => (
            <TaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              status={task.status as TaskStatus}
              subTodos={task.subTodos.map((st) => ({
                content: st.content,
                checked: st.checked,
                position: st.position,
              }))}
              result={
                task.result
                  ? {
                      summary: task.result.summary,
                      filesChanged: task.result.filesChanged as Array<{
                        path: string;
                        status: "added" | "modified" | "deleted";
                        additions: number;
                        deletions: number;
                      }>,
                      tokensUsed: task.result.tokensUsed,
                      durationMs: task.result.durationMs,
                      adminReview: task.result.adminReview as { verdict: string; notes: string } | null,
                    }
                  : null
              }
              onRequestReview={(taskId) => requestReview.mutate({ taskId })}
            />
          ))
        )}

        {/* Create form */}
        <TaskCreateForm
          projectId={projectId}
          onSubmit={handleCreateTask}
        />
      </div>
    </div>
  );
}
