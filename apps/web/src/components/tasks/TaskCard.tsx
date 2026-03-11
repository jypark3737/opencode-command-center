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

interface VerificationBadgeInfo {
  passed: boolean;
  type: string;
}

interface TaskCardProps {
  id: string;
  title: string;
  status: TaskStatus;
  subTodos: SubTodo[];
  result: TaskResult | null;
  sessionPath?: string;
  sessionTitle?: string;
  verificationResult?: VerificationBadgeInfo;
  onRequestReview: (taskId: string) => void;
}

function truncatePath(p: string): string {
  const segments = p.replace(/\/$/, "").split("/").filter(Boolean);
  if (segments.length <= 2) return segments.join("/");
  return "…/" + segments.slice(-2).join("/");
}

export function TaskCard({
  id,
  title,
  status,
  subTodos,
  result,
  sessionPath,
  sessionTitle,
  verificationResult,
  onRequestReview,
}: TaskCardProps) {
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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {verificationResult && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "2px 7px",
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 500,
                  color: verificationResult.passed ? "#22c55e" : "#ef4444",
                  background: verificationResult.passed
                    ? "rgba(34,197,94,0.10)"
                    : "rgba(239,68,68,0.10)",
                }}
              >
                {verificationResult.passed ? "✓" : "✗"} verified
              </span>
            )}
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Session assignment line */}
        {sessionPath && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: "#666",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ color: "#555" }}>⚡</span>
            <span>Session: {sessionTitle ?? truncatePath(sessionPath)}</span>
          </div>
        )}

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
