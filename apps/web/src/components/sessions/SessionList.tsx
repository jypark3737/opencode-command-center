"use client";

import { useCallback } from "react";
import Link from "next/link";
import { trpcReact } from "@/lib/trpc-client";
import { useSSE } from "@/hooks/useSSE";
import type { DashboardEvent, SessionStatus } from "@opencode-cc/shared";

const SESSION_STATUS_COLOR: Record<SessionStatus, { color: string; bg: string }> = {
  DISCOVERED: { color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  IDLE: { color: "#22c55e", bg: "rgba(34,197,94,0.10)" },
  BUSY: { color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  DEAD: { color: "#ef4444", bg: "rgba(239,68,68,0.10)" },
};

function truncatePath(p: string): string {
  const segments = p.replace(/\/$/, "").split("/").filter(Boolean);
  if (segments.length <= 2) return segments.join("/");
  return "…/" + segments.slice(-2).join("/");
}

interface SessionListProps {
  deviceId: string;
  onCreateSession?: () => void;
}

export function SessionList({ deviceId, onCreateSession }: SessionListProps) {
  const utils = trpcReact.useUtils();
  const { data: sessions } = trpcReact.sessions.listByDevice.useQuery({ deviceId });

  useSSE(
    useCallback(
      (event: DashboardEvent) => {
        if (
          (event.type === "session_discovered" && event.deviceId === deviceId) ||
          (event.type === "session_status_changed" && event.deviceId === deviceId)
        ) {
          utils.sessions.listByDevice.invalidate({ deviceId });
        }
      },
      [deviceId, utils]
    )
  );

  const sessionList = sessions ?? [];

  return (
    <div style={{ paddingLeft: 14, paddingTop: 4, paddingBottom: 4 }}>
      {sessionList.length === 0 ? (
        <p style={{ fontSize: 11, color: "#555", margin: "2px 0" }}>No sessions</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {sessionList.map((s) => {
            const statusKey = s.status as SessionStatus;
            const cfg = SESSION_STATUS_COLOR[statusKey] ?? SESSION_STATUS_COLOR.DISCOVERED;
            return (
              <li
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 0",
                  fontSize: 12,
                  color: "#bbb",
                }}
              >
                <Link
                  href={"/dashboard/sessions/" + s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    textDecoration: "none",
                    color: "inherit",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "1px 6px",
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 500,
                      color: cfg.color,
                      background: cfg.bg,
                      flexShrink: 0,
                    }}
                  >
                    {statusKey.toLowerCase()}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#999",
                      fontSize: 11,
                    }}
                    title={s.title ?? s.projectPath}
                  >
                    {s.title ?? truncatePath(s.projectPath)}
                  </span>
                  {statusKey === "BUSY" && s.currentTask && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "#6366f1",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 80,
                      }}
                      title={s.currentTask.title}
                    >
                      {s.currentTask.title}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {onCreateSession && (
        <button
          onClick={onCreateSession}
          style={{
            marginTop: 4,
            padding: "2px 0",
            background: "transparent",
            border: "none",
            color: "#555",
            fontSize: 11,
            cursor: "pointer",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#6366f1";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#555";
          }}
        >
          + New session
        </button>
      )}
    </div>
  );
}
