export default function DashboardPage() {
  return (
    <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fff", margin: "0 0 8px" }}>
          OpenCode Command Center
        </h2>
        <p style={{ color: "#888", fontSize: 14, maxWidth: 320, margin: 0 }}>
          Select a project from the sidebar to view and manage tasks.
        </p>
      </div>
    </div>
  );
}
