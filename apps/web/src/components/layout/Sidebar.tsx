import Link from "next/link";
import { ProjectList } from "./ProjectList";
import { DeviceList } from "./DeviceList";

export function Sidebar() {
  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#111",
        borderRight: "1px solid #2a2a2a",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px", borderBottom: "1px solid #2a2a2a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            OC
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>
            Command Center
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {/* Projects */}
        <div style={{ padding: "8px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#888",
              }}
            >
              Projects
            </span>
            <Link
              href="/dashboard"
              style={{ fontSize: 11, color: "#888", textDecoration: "none" }}
            >
              + Add
            </Link>
          </div>
          <ProjectList />
        </div>

        <div style={{ margin: "8px 12px", borderTop: "1px solid #2a2a2a" }} />

        {/* Devices */}
        <div style={{ padding: "8px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#888",
              }}
            >
              Devices
            </span>
            <Link
              href="/dashboard"
              style={{ fontSize: 11, color: "#888", textDecoration: "none" }}
            >
              + Add
            </Link>
          </div>
          <DeviceList />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #2a2a2a" }}>
        <span style={{ fontSize: 11, color: "#555" }}>OpenCode CC v0.1.0</span>
      </div>
    </aside>
  );
}
