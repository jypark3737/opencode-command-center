"use client";

import { useState } from "react";
import { StatusBadge } from "./LiveTaskStatus";
import { SubTodoList } from "./SubTodoList";
import { TaskDetailModal } from "./TaskDetailModal";
import type { TaskStatus } from "@opencode-cc/shared";

interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
}

interface TaskResult {
  summary: string;
  filesChanged: FileChange[];
  tokensUsed: number;
  durationMs: number;
  adminReview: { verdict: string; notes: string } | null;
}

interface SubTodo {
  content: string;
  checked: boolean;
  position: number;
}

interface TaskCardProps {
  id: string;
  title: string;
  status: TaskStatus;
  subTodos: SubTodo[];
  result: TaskResult | null;
  onRequestReview: (taskId: string) => void;
}

export function TaskCard({ id, title, status, subTodos, result, onRequestReview }: TaskCardProps) {
  const [showModal, setShowModal] = useState(false);
  const isClickable = status === "DONE" || status === "FAILED";

  return (
    <>
      <div
        onClick={() => isClickable && setShowModal(true)}
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          padding: "12px 16px",
          cursor: isClickable ? "pointer" : "default",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          if (isClickable) (e.currentTarget as HTMLDivElement).style.borderColor = "#3a3a3a";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#2a2a2a";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontWeight: 500, color: "#e5e5e5", fontSize: 14, flex: 1 }}>
            {title}
          </span>
          <StatusBadge status={status} />
        </div>

        {/* Show subtodos when running */}
        {status === "RUNNING" && subTodos.length > 0 && (
          <SubTodoList subTodos={subTodos} />
        )}

        {/* Show token count when done */}
        {status === "DONE" && result && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#555" }}>
            {result.tokensUsed.toLocaleString()} tokens · {result.filesChanged.length} files changed
            {isClickable && <span style={{ color: "#6366f1", marginLeft: 8 }}>View details →</span>}
          </div>
        )}

        {/* Show error when failed */}
        {status === "FAILED" && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#ef4444" }}>
            Task failed · Click to view details
          </div>
        )}
      </div>

      {showModal && (
        <TaskDetailModal
          taskId={id}
          title={title}
          result={result}
          subTodos={subTodos}
          onClose={() => setShowModal(false)}
          onRequestReview={() => {
            onRequestReview(id);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
