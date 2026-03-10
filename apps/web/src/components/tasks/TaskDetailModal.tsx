"use client";

import type { FileChange } from "@opencode-cc/shared";
import { SubTodoList } from "./SubTodoList";

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

interface TaskDetailModalProps {
  taskId: string;
  title: string;
  result: TaskResult | null;
  subTodos: SubTodo[];
  onClose: () => void;
  onRequestReview: () => void;
}

export function TaskDetailModal({
  title,
  result,
  subTodos,
  onClose,
  onRequestReview,
}: TaskDetailModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 24,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 12,
          width: "100%",
          maxWidth: 640,
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #2a2a2a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#fff" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              fontSize: 18,
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {result ? (
            <>
              {/* Stats */}
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                <Stat label="Tokens" value={result.tokensUsed.toLocaleString()} />
                <Stat label="Duration" value={formatDuration(result.durationMs)} />
                <Stat label="Files" value={String(result.filesChanged.length)} />
              </div>

              {/* Summary */}
              <Section title="Summary">
                <p style={{ margin: 0, color: "#ccc", lineHeight: 1.6, fontSize: 13 }}>
                  {result.summary}
                </p>
              </Section>

              {/* Files changed */}
              {result.filesChanged.length > 0 && (
                <Section title="Files Changed">
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {result.filesChanged.map((f, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px 0",
                          fontSize: 12,
                          fontFamily: "monospace",
                          color: "#ccc",
                        }}
                      >
                        <span style={{ color: fileStatusColor(f.status), width: 12 }}>
                          {fileStatusIcon(f.status)}
                        </span>
                        {f.path}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Subtodos */}
              {subTodos.length > 0 && (
                <Section title="Task Checklist">
                  <SubTodoList subTodos={subTodos} />
                </Section>
              )}

              {/* Admin review */}
              {result.adminReview && (
                <Section title="Admin Review">
                  <div
                    style={{
                      background: "#111",
                      border: "1px solid #2a2a2a",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4, fontSize: 13 }}>
                      {result.adminReview.verdict}
                    </div>
                    <div style={{ color: "#aaa", fontSize: 12 }}>
                      {result.adminReview.notes}
                    </div>
                  </div>
                </Section>
              )}
            </>
          ) : (
            <p style={{ color: "#888", fontSize: 13 }}>No result data available yet.</p>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #2a2a2a",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          {result && !result.adminReview && (
            <button
              onClick={onRequestReview}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid #2a2a2a",
                background: "transparent",
                color: "#aaa",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              🤖 Request Review
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#888" }}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function fileStatusColor(status: string): string {
  if (status === "added") return "#22c55e";
  if (status === "deleted") return "#ef4444";
  return "#f59e0b";
}

function fileStatusIcon(status: string): string {
  if (status === "added") return "+";
  if (status === "deleted") return "-";
  return "~";
}
