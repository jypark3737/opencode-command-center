"use client";

import { useState } from "react";
import { trpcReact } from "@/lib/trpc-client";

interface CreateSessionFormProps {
  preselectedDeviceId?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateSessionForm({ preselectedDeviceId, onClose, onCreated }: CreateSessionFormProps) {
  const utils = trpcReact.useUtils();
  const { data: devices } = trpcReact.devices.list.useQuery();
  const [deviceId, setDeviceId] = useState(preselectedDeviceId ?? "");
  const [projectPath, setProjectPath] = useState("");
  const [loading, setLoading] = useState(false);

  const createSession = trpcReact.sessions.create.useMutation({
    onSuccess: () => {
      utils.sessions.listByDevice.invalidate();
      utils.sessions.list.invalidate();
      onCreated();
    },
  });

  const deviceList = devices ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceId || !projectPath.trim()) return;
    setLoading(true);
    try {
      await createSession.mutateAsync({ deviceId, projectPath: projectPath.trim() });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 10,
          padding: 24,
          width: 380,
          maxWidth: "90vw",
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "#e5e5e5" }}>
          Create Session
        </h3>

        {/* Device selector */}
        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>
            Device
          </span>
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              background: "#0a0a0a",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              color: "#e5e5e5",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          >
            <option value="">Select a device…</option>
            {deviceList
              .filter((d) => d.status === "ONLINE")
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </label>

        {/* Project path */}
        <label style={{ display: "block", marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>
            Project Path
          </span>
          <input
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder="/home/user/projects/my-app"
            style={{
              width: "100%",
              padding: "8px 10px",
              background: "#0a0a0a",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              color: "#e5e5e5",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </label>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 14px",
              background: "transparent",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              color: "#888",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !deviceId || !projectPath.trim()}
            style={{
              padding: "7px 14px",
              background: "#6366f1",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 500,
              opacity: loading || !deviceId || !projectPath.trim() ? 0.5 : 1,
            }}
          >
            {loading ? "Creating…" : "Create Session"}
          </button>
        </div>
      </form>
    </div>
  );
}
