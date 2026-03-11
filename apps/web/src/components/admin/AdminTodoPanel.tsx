"use client";

import { useState, useCallback } from "react";
import { trpcReact } from "@/lib/trpc-client";
import { useSSE } from "@/hooks/useSSE";
import type { DashboardEvent } from "@opencode-cc/shared";

const TODO_STATUS_COLOR: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: "#6b7280", bg: "rgba(107,114,128,0.10)", label: "pending" },
  CONVERTING: { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", label: "converting" },
  READY: { color: "#3b82f6", bg: "rgba(59,130,246,0.10)", label: "ready" },
  ASSIGNED: { color: "#6366f1", bg: "rgba(99,102,241,0.12)", label: "assigned" },
  VERIFYING: { color: "#8b5cf6", bg: "rgba(139,92,246,0.10)", label: "verifying" },
  DONE: { color: "#22c55e", bg: "rgba(34,197,94,0.10)", label: "done" },
  FAILED: { color: "#ef4444", bg: "rgba(239,68,68,0.10)", label: "failed" },
  CANCELLED: { color: "#4b5563", bg: "rgba(75,85,99,0.10)", label: "cancelled" },
};

export function AdminTodoPanel() {
  const [expanded, setExpanded] = useState(false);
  const [todoInput, setTodoInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const utils = trpcReact.useUtils();

  const { data: status } = trpcReact.admin.getSystemStatus.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  const { data: todos } = trpcReact.admin.getTodos.useQuery(
    undefined,
    { enabled: expanded, refetchInterval: 10000 }
  );

  const { data: orchestratorStatus } = trpcReact.admin.getOrchestratorStatus.useQuery(
    undefined,
    { enabled: expanded, refetchInterval: 5000 }
  );

  const submitTodos = trpcReact.admin.submitTodos.useMutation({
    onSuccess: () => {
      setTodoInput("");
      utils.admin.getTodos.invalidate();
    },
  });

  const triggerOrchestration = trpcReact.admin.triggerOrchestration.useMutation({
    onSuccess: () => {
      utils.admin.getTodos.invalidate();
      utils.admin.getOrchestratorStatus.invalidate();
    },
  });

  const cancelTodo = trpcReact.admin.cancelTodo.useMutation({
    onSuccess: () => {
      utils.admin.getTodos.invalidate();
    },
  });

  // SSE real-time updates
  useSSE(
    useCallback(
      (event: DashboardEvent) => {
        if (
          event.type === "admin_todo_status_changed" ||
          event.type === "admin_orchestrator_status" ||
          event.type === "admin_verification_result" ||
          event.type === "admin_todo_escalated"
        ) {
          utils.admin.getTodos.invalidate();
          utils.admin.getOrchestratorStatus.invalidate();
        }
      },
      [utils]
    )
  );

  const todoList = todos ?? [];
  const activeTodos = todoList.filter((t) => !["DONE", "CANCELLED"].includes(t.status));
  const doneTodos = todoList.filter((t) => ["DONE", "CANCELLED"].includes(t.status));
  const pendingCount = todoList.filter((t) => t.status === "PENDING").length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!todoInput.trim()) return;
    setSubmitting(true);
    try {
      await submitTodos.mutateAsync({ content: todoInput });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      margin: "0 24px 24px",
      background: "#1a1a1a",
      border: `1px solid ${orchestratorStatus?.isProcessing ? "#6366f1" : "#2a2a2a"}`,
      borderRadius: 8,
      overflow: "hidden",
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#ccc",
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>🤖</span>
          <span style={{ fontWeight: 500 }}>Admin Agent</span>
          {status && (
            <span style={{ fontSize: 11, color: "#555" }}>
              {status.stats.onlineDevices} online · {status.stats.activeTasks} running
            </span>
          )}
          {orchestratorStatus?.isProcessing && (
            <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 500 }}>
              ⚡ {orchestratorStatus.currentAction}
            </span>
          )}
          {activeTodos.length > 0 && (
            <span style={{
              fontSize: 10,
              fontWeight: 500,
              color: "#6366f1",
              background: "rgba(99,102,241,0.12)",
              padding: "1px 6px",
              borderRadius: 10,
            }}>
              {activeTodos.length} active
            </span>
          )}
        </div>
        <span style={{ color: "#555" }}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div style={{ borderTop: "1px solid #2a2a2a" }}>
          {/* Todo input */}
          <form onSubmit={handleSubmit} style={{ padding: "12px 16px", borderBottom: "1px solid #2a2a2a" }}>
            <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Add Todos (one per line)
            </label>
            <textarea
              value={todoInput}
              onChange={(e) => setTodoInput(e.target.value)}
              placeholder={"Add authentication to the user profile page\nFix the memory leak in the data processor\nWrite unit tests for the payment module"}
              rows={4}
              style={{
                width: "100%",
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: 6,
                color: "#e5e5e5",
                fontSize: 13,
                padding: "8px 10px",
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={submitting || !todoInput.trim()}
                style={{
                  padding: "6px 14px",
                  background: "#6366f1",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  cursor: submitting || !todoInput.trim() ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  opacity: submitting || !todoInput.trim() ? 0.6 : 1,
                }}
              >
                {submitting ? "Submitting..." : "Submit Todos"}
              </button>
              <button
                type="button"
                disabled={pendingCount === 0 || triggerOrchestration.isPending || orchestratorStatus?.isProcessing}
                onClick={() => triggerOrchestration.mutate()}
                style={{
                  padding: "6px 14px",
                  background: "transparent",
                  border: `1px solid ${pendingCount > 0 ? "#6366f1" : "#2a2a2a"}`,
                  borderRadius: 6,
                  color: pendingCount > 0 ? "#6366f1" : "#555",
                  cursor: pendingCount === 0 ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  opacity: pendingCount === 0 || orchestratorStatus?.isProcessing ? 0.6 : 1,
                }}
              >
                {orchestratorStatus?.isProcessing ? "Processing..." : `▶ Run Orchestration${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
              </button>
            </div>
          </form>

          {/* Active todos */}
          {activeTodos.length > 0 && (
            <div style={{ padding: "12px 16px", borderBottom: doneTodos.length > 0 ? "1px solid #2a2a2a" : undefined }}>
              <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Active ({activeTodos.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {activeTodos.map((todo) => {
                  const cfg = TODO_STATUS_COLOR[todo.status] ?? TODO_STATUS_COLOR.PENDING;
                  return (
                    <div key={todo.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "1px 7px",
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 500,
                        color: cfg.color,
                        background: cfg.bg,
                        flexShrink: 0,
                        marginTop: 1,
                      }}>
                        {cfg.label}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#ccc", wordBreak: "break-word" }}>{todo.content}</div>
                        {todo.convertedInstruction && (
                          <div style={{ fontSize: 11, color: "#666", marginTop: 3, paddingLeft: 8, borderLeft: "2px solid #2a2a2a" }}>
                            {todo.convertedInstruction.slice(0, 120)}{todo.convertedInstruction.length > 120 ? "…" : ""}
                          </div>
                        )}
                        {todo.retryCount > 0 && (
                          <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                            Retry {todo.retryCount}/{todo.maxRetries}
                          </div>
                        )}
                      </div>
                      {["PENDING", "READY"].includes(todo.status) && (
                        <button
                          onClick={() => cancelTodo.mutate({ id: todo.id })}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#555",
                            cursor: "pointer",
                            fontSize: 14,
                            padding: "0 4px",
                            flexShrink: 0,
                          }}
                          title="Cancel"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Done todos (collapsed) */}
          {doneTodos.length > 0 && (
            <div style={{ padding: "8px 16px" }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Completed: {doneTodos.filter((t) => t.status === "DONE").length} ✓ · Cancelled: {doneTodos.filter((t) => t.status === "CANCELLED").length}
              </div>
            </div>
          )}

          {todoList.length === 0 && (
            <div style={{ padding: "16px", fontSize: 13, color: "#555", textAlign: "center" }}>
              No todos yet. Add some tasks above.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
