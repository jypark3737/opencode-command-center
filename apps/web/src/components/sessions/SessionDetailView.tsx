"use client";

import { useCallback } from "react";
import Link from "next/link";
import { trpcReact } from "@/lib/trpc-client";
import { useSSE } from "@/hooks/useSSE";
import type { DashboardEvent, SessionStatus } from "@opencode-cc/shared";

const STATUS_COLOR: Record<SessionStatus, { color: string; bg: string }> = {
  DISCOVERED: { color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  IDLE: { color: "#22c55e", bg: "rgba(34,197,94,0.10)" },
  BUSY: { color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  DEAD: { color: "#ef4444", bg: "rgba(239,68,68,0.10)" },
};

const TODO_STATUS_COLOR: Record<string, string> = {
  PENDING: "#6b7280",
  CONVERTING: "#f59e0b",
  READY: "#3b82f6",
  ASSIGNED: "#6366f1",
  VERIFYING: "#8b5cf6",
  DONE: "#22c55e",
  FAILED: "#ef4444",
  CANCELLED: "#4b5563",
};

export function SessionDetailView({ sessionId }: { sessionId: string }) {
  const utils = trpcReact.useUtils();

  const { data: session, isLoading } =
    trpcReact.sessions.getSessionDetail.useQuery({ id: sessionId });
  const { data: tasks } = trpcReact.sessions.getSessionTasks.useQuery({
    sessionId,
  });
  const deleteMutation = trpcReact.sessions.delete.useMutation({
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
  });

  // Real-time updates
  useSSE(
    useCallback(
      (event: DashboardEvent) => {
        if (
          (event.type === "session_status_changed" &&
            event.sessionId === sessionId) ||
          event.type === "task_status_changed" ||
          event.type === "admin_todo_status_changed"
        ) {
          utils.sessions.getSessionDetail.invalidate({ id: sessionId });
          utils.sessions.getSessionTasks.invalidate({ sessionId });
        }
      },
      [sessionId, utils]
    )
  );

  if (isLoading) {
    return (
      <div style={{ padding: "24px", color: "#888", fontSize: 14 }}>
        Loading session…
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ padding: "24px", color: "#ef4444", fontSize: 14 }}>
        Session not found.{" "}
        <Link href="/dashboard" style={{ color: "#6366f1" }}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  const statusCfg =
    STATUS_COLOR[session.status as SessionStatus] ?? STATUS_COLOR.DISCOVERED;
  const taskList = tasks ?? [];
  const adminTodos = session.adminTodos ?? [];

  return (
    <div style={{ padding: "24px", maxWidth: 760 }}>
      {/* Back link */}
      <Link
        href="/dashboard"
        style={{
          fontSize: 12,
          color: "#888",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 16,
        }}
      >
        ← Back to dashboard
      </Link>

      {/* Header */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 10,
          padding: "20px 24px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: "#e5e5e5",
              }}
            >
              {session.title ?? "Untitled Session"}
            </h1>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "#666",
                fontFamily: "monospace",
              }}
            >
              {session.projectPath}
            </div>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 10px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 500,
              color: statusCfg.color,
              background: statusCfg.bg,
              flexShrink: 0,
            }}
          >
            {(session.status as string).toLowerCase()}
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 16,
            fontSize: 12,
            color: "#666",
          }}
        >
          <span>
            Device:{" "}
            <span style={{ color: "#aaa" }}>{session.device.name}</span>
          </span>
          <span>
            Host:{" "}
            <span style={{ color: "#aaa" }}>{session.device.hostname}</span>
          </span>
          {session.opencodeSessionId && (
            <span>
              OpenCode ID:{" "}
              <span style={{ color: "#aaa", fontFamily: "monospace" }}>
                {session.opencodeSessionId.slice(0, 8)}…
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Current Task */}
      {session.currentTask && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#888",
              marginBottom: 8,
            }}
          >
            Current Task
          </div>
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #6366f1",
              borderRadius: 8,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ fontWeight: 500, color: "#e5e5e5", fontSize: 14 }}
              >
                {session.currentTask.title}
              </span>
              <span
                style={{ fontSize: 11, color: "#6366f1", fontWeight: 500 }}
              >
                {session.currentTask.status.toLowerCase()}
              </span>
            </div>
            {session.currentTask.subTodos &&
              session.currentTask.subTodos.length > 0 && (
                <ul
                  style={{ listStyle: "none", margin: "10px 0 0", padding: 0 }}
                >
                  {session.currentTask.subTodos.map((todo) => (
                    <li
                      key={todo.id}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                        padding: "2px 0",
                        fontSize: 12,
                        color: todo.checked ? "#555" : "#aaa",
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          color: todo.checked ? "#22c55e" : "#555",
                        }}
                      >
                        {todo.checked ? "✓" : "○"}
                      </span>
                      <span
                        style={{
                          textDecoration: todo.checked
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {todo.content}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </div>
      )}

      {/* Task History */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#888",
            marginBottom: 8,
          }}
        >
          Task History ({taskList.length})
        </div>
        {taskList.length === 0 ? (
          <p style={{ fontSize: 13, color: "#555", margin: 0 }}>
            No tasks assigned yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {taskList.map((task) => (
              <div
                key={task.id}
                style={{
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: 8,
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#e5e5e5",
                    }}
                  >
                    {task.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "#888",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {task.status}
                  </span>
                </div>
                {task.project && (
                  <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                    Project: {task.project.name}
                  </div>
                )}
                {task.result && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#555" }}>
                    {task.result.tokensUsed.toLocaleString()} tokens ·{" "}
                    {Array.isArray(task.result.filesChanged)
                      ? task.result.filesChanged.length
                      : 0}{" "}
                    files changed
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Todos */}
      {adminTodos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#888",
              marginBottom: 8,
            }}
          >
            Admin Todos ({adminTodos.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {adminTodos.map((todo) => (
              <div
                key={todo.id}
                style={{
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: 6,
                  padding: "10px 14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 13, color: "#ccc", flex: 1 }}>
                    {todo.content}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: TODO_STATUS_COLOR[todo.status] ?? "#888",
                      flexShrink: 0,
                    }}
                  >
                    {todo.status.toLowerCase()}
                  </span>
                </div>
                {todo.convertedInstruction && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: "#666",
                      paddingLeft: 8,
                      borderLeft: "2px solid #2a2a2a",
                    }}
                  >
                    {todo.convertedInstruction}
                  </div>
                )}
                {todo.retryCount > 0 && (
                  <div style={{ marginTop: 4, fontSize: 10, color: "#888" }}>
                    Retry {todo.retryCount}/{todo.maxRetries}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete button */}
      <div
        style={{ borderTop: "1px solid #2a2a2a", paddingTop: 16, marginTop: 8 }}
      >
        <button
          onClick={() => {
            if (confirm("Delete this session?")) {
              deleteMutation.mutate({ id: sessionId });
            }
          }}
          style={{
            padding: "6px 14px",
            background: "transparent",
            border: "1px solid #3a1a1a",
            borderRadius: 6,
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Delete Session
        </button>
      </div>
    </div>
  );
}
