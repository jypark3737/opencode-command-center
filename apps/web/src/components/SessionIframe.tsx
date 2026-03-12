"use client";

import { useState } from "react";

interface SessionIframeProps {
  deviceId: string;
  sessionId: string;
  isActive: boolean;
}

export default function SessionIframe({ deviceId, sessionId, isActive }: SessionIframeProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      style={{
        display: isActive ? "block" : "none",
        position: "relative",
        width: "100%",
        height: "calc(100vh - 40px)",
      }}
    >
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#030712",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              color: "#6b7280",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                border: "2px solid #374151",
                borderTopColor: "#60a5fa",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
            <span style={{ fontSize: "13px" }}>Connecting…</span>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <iframe
        src={`/t/${deviceId}/${sessionId}/`}
        onLoad={() => setLoaded(true)}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
          background: "#030712",
        }}
        title={`session-${sessionId}`}
      />
    </div>
  );
}
