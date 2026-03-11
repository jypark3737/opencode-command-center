"use client";

import { useCallback, useState } from "react";
import { trpcReact } from "@/lib/trpc-client";
import { useSSE } from "@/hooks/useSSE";
import Link from "next/link";
import { SessionList } from "@/components/sessions/SessionList";
import { CreateSessionForm } from "@/components/sessions/CreateSessionForm";
import type { DashboardEvent } from "@opencode-cc/shared";
import type { DeviceStatus } from "@opencode-cc/shared";

const STATUS_COLOR: Record<DeviceStatus, string> = {
  ONLINE: "#22c55e",
  OFFLINE: "#6b7280",
  STALE: "#f59e0b",
};

export function DeviceList() {
  const utils = trpcReact.useUtils();
  const { data: devices } = trpcReact.devices.list.useQuery();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateFor, setShowCreateFor] = useState<string | null>(null);

  // Real-time device + session updates
  useSSE(
    useCallback(
      (event: DashboardEvent) => {
        if (event.type === "device_status_changed") {
          utils.devices.list.invalidate();
        } else if (
          event.type === "session_discovered" ||
          event.type === "session_status_changed"
        ) {
          utils.sessions.listByDevice.invalidate();
        }
      },
      [utils]
    )
  );

  const deviceList = devices ?? [];

  if (deviceList.length === 0) {
    return (
      <p style={{ fontSize: 12, color: "#555", padding: "4px 8px", margin: 0 }}>
        No devices registered
      </p>
    );
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {deviceList.map((d) => {
        const isExpanded = expandedId === d.id;
        return (
          <li key={d.id}>
            <div
              onClick={() => setExpandedId(isExpanded ? null : d.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                fontSize: 13,
                color: "#ccc",
                cursor: "pointer",
                borderRadius: 4,
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: "#555",
                  transition: "transform 0.15s",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  flexShrink: 0,
                  width: 10,
                  textAlign: "center",
                }}
              >
                ▶
              </span>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: STATUS_COLOR[d.status as DeviceStatus] ?? "#6b7280",
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.name}
              </span>
              <span style={{ fontSize: 10, color: "#555" }}>
                {d.status.toLowerCase()}
              </span>
            </div>

            {isExpanded && (
              <div style={{ borderLeft: "1px solid #2a2a2a", marginLeft: 12 }}>
                {d.projects && d.projects.length > 0 && (
                  <div>
                    {d.projects.map((p) => (
                      <Link key={p.id} href={`/dashboard/${p.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 8px",
                          fontSize: 12,
                          color: "#bbb",
                          textDecoration: "none",
                          borderRadius: 4,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
                <SessionList
                  deviceId={d.id}
                  onCreateSession={() => setShowCreateFor(d.id)}
                />
              </div>
            )}

            {showCreateFor === d.id && (
              <CreateSessionForm
                preselectedDeviceId={d.id}
                onClose={() => setShowCreateFor(null)}
                onCreated={() => {
                  setShowCreateFor(null);
                  setExpandedId(d.id);
                }}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
