"use client";

import { useEffect, useState } from "react";

interface DeviceSession {
  id: string;
  directory: string;
  title?: string;
  timeCreated: string;
  webPort?: number;
}

interface Device {
  deviceId: string;
  deviceName: string;
  hostname: string;
  sessions: DeviceSession[];
}

interface DeviceSidebarProps {
  onOpenSession: (
    deviceId: string,
    sessionId: string,
    title: string,
    deviceName: string
  ) => void;
  startingSessionIds?: Set<string>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 24) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function truncateDir(dir: string, maxLen = 32): string {
  if (dir.length <= maxLen) return dir;
  const parts = dir.split("/");
  if (parts.length > 2) {
    return `\u2026/${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }
  return `\u2026${dir.slice(-maxLen)}`;
}

export default function DeviceSidebar({
  onOpenSession,
  startingSessionIds = new Set(),
}: DeviceSidebarProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    async function fetchDevices() {
      try {
        const res = await fetch("/api/devices");
        if (res.ok && active) {
          const data = await res.json() as { devices: Device[] };
          setDevices(data.devices);
        }
      } catch (_) {
        void _;
      }
    }

    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  function toggleCollapse(deviceId: string) {
    setCollapsed((prev) => ({ ...prev, [deviceId]: !prev[deviceId] }));
  }

  return (
    <aside
      style={{
        width: "280px",
        minWidth: "280px",
        background: "var(--sidebar)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100vh",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: devices.length > 0 ? "#22c55e" : "#4b5563",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#9ca3af",
          }}
        >
          Devices
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "11px",
            color: "#4b5563",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {devices.length}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {devices.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "#4b5563",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>⚡</div>
            No devices connected
          </div>
        ) : (
          devices.map((device) => {
            const isCollapsed = collapsed[device.deviceId] ?? false;
            return (
              <div key={device.deviceId} style={{ borderBottom: "1px solid var(--border)" }}>
                <button
                  onClick={() => toggleCollapse(device.deviceId)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--foreground)",
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#1a1a1a";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#22c55e",
                      flexShrink: 0,
                      boxShadow: "0 0 4px rgba(34,197,94,0.5)",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#e5e7eb",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {device.deviceName}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {device.hostname}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#4b5563",
                      transition: "transform 0.15s",
                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    }}
                  >
                    ▾
                  </span>
                </button>

                {!isCollapsed && (
                  <div style={{ paddingBottom: "4px" }}>
                    {device.sessions.length === 0 ? (
                      <div
                        style={{
                          padding: "6px 16px 8px 32px",
                          fontSize: "12px",
                          color: "#4b5563",
                          fontStyle: "italic",
                        }}
                      >
                        No sessions
                      </div>
                    ) : (
                      device.sessions.map((session) => {
                        const title = session.title ?? "Untitled";
                        const isStarting = startingSessionIds.has(session.id);

                        return (
                          <button
                            key={session.id}
                            onClick={() =>
                              onOpenSession(
                                device.deviceId,
                                session.id,
                                title,
                                device.deviceName
                              )
                            }
                            style={{
                              width: "100%",
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              padding: "7px 16px 7px 28px",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "background 0.1s",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background = "#1e1e1e";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  color: "#d1d5db",
                                  flex: 1,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {title}
                              </span>
                              {isStarting && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    padding: "1px 5px",
                                    background: "#1e3a5f",
                                    color: "#60a5fa",
                                    borderRadius: "3px",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                    flexShrink: 0,
                                  }}
                                >
                                  Starting…
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#6b7280",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {truncateDir(session.directory)}
                            </div>
                            <div style={{ fontSize: "10px", color: "#4b5563" }}>
                              {formatDate(session.timeCreated)}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
