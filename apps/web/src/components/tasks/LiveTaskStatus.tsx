"use client";

import type { TaskStatus } from "@opencode-cc/shared";

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Pending", color: "#888", bg: "#1a1a1a" },
  ASSIGNED: { label: "Assigned", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  RUNNING: { label: "Running", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  DONE: { label: "Done", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  FAILED: { label: "Failed", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  CANCELLED: { label: "Cancelled", color: "#6b7280", bg: "#1a1a1a" },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 500,
        color: cfg.color,
        background: cfg.bg,
      }}
    >
      {status === "RUNNING" && (
        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: cfg.color, animation: "pulse 1.5s infinite" }} />
      )}
      {cfg.label}
    </span>
  );
}
