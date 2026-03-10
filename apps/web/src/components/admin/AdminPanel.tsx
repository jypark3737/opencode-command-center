"use client";

import { useState } from "react";
import { trpcReact } from "@/lib/trpc-client";

export function AdminPanel() {
  const [expanded, setExpanded] = useState(false);

  const { data: status } = trpcReact.admin.getSystemStatus.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  const { data: health } = trpcReact.admin.getHealthReport.useQuery(
    undefined,
    { refetchInterval: 60000, enabled: expanded }
  );

  const hasIssues =
    (health?.staleDevices.length ?? 0) > 0 ||
    (health?.stuckTasks.length ?? 0) > 0;

  return (
    <div
      style={{
        margin: "0 24px 24px",
        background: "#1a1a1a",
        border: `1px solid ${hasIssues ? "#f59e0b" : "#2a2a2a"}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
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
              {status.stats.onlineDevices} online · {status.stats.activeTasks} running · {status.stats.pendingTasks} pending
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasIssues && (
            <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 500 }}>
              ⚠ Issues detected
            </span>
          )}
          <span style={{ color: "#555" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #2a2a2a" }}>
          {/* Device grid */}
          {status && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Devices
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {status.devices.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      padding: "6px 10px",
                      background: "#111",
                      border: "1px solid #2a2a2a",
                      borderRadius: 6,
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background:
                          d.status === "ONLINE"
                            ? "#22c55e"
                            : d.status === "STALE"
                            ? "#f59e0b"
                            : "#6b7280",
                      }}
                    />
                    <span style={{ color: "#ccc" }}>{d.name}</span>
                    {d.lastHeartbeat && (
                      <span style={{ color: "#555", fontSize: 10 }}>
                        {formatAge(new Date(d.lastHeartbeat))}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues */}
          {health && hasIssues && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ⚠ Issues
              </div>
              {health.staleDevices.map((d) => (
                <div key={d.id} style={{ fontSize: 12, color: "#f59e0b", padding: "2px 0" }}>
                  Device &quot;{d.name}&quot; has stale heartbeat
                </div>
              ))}
              {health.stuckTasks.map((t) => (
                <div key={t.id} style={{ fontSize: 12, color: "#f59e0b", padding: "2px 0" }}>
                  Task &quot;{t.title}&quot; has been {t.status.toLowerCase()} for over 1 hour
                </div>
              ))}
            </div>
          )}

          {health && !hasIssues && (
            <div style={{ marginTop: 12, fontSize: 12, color: "#22c55e" }}>
              ✓ All systems healthy
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatAge(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
