"use client";

import { useState, useCallback } from "react";
import DeviceSidebar from "@/components/DeviceSidebar";
import SessionTabs, { type Tab } from "@/components/SessionTabs";
import SessionIframe from "@/components/SessionIframe";

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

async function pollForWebPort(
  deviceId: string,
  sessionId: string,
  maxWaitMs = 30_000,
  intervalMs = 2_000
): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    try {
      const res = await fetch("/api/devices");
      if (!res.ok) continue;
      const data = await res.json() as { devices: Device[] };
      const device = data.devices.find((d) => d.deviceId === deviceId);
      const session = device?.sessions.find((s) => s.id === sessionId);
      if (session?.webPort != null) return true;
    } catch (_) {
      void _;
    }
  }
  return false;
}

export default function Home() {
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [startingSessionIds, setStartingSessionIds] = useState<Set<string>>(new Set());

  const openSession = useCallback(
    async (deviceId: string, sessionId: string, title: string, deviceName: string) => {
      setOpenTabs((prev) => {
        if (prev.some((t) => t.sessionId === sessionId)) return prev;
        return [...prev, { deviceId, sessionId, title, deviceName }];
      });
      setActiveTab(sessionId);

      const res = await fetch("/api/devices");
      if (!res.ok) return;
      const data = await res.json() as { devices: Device[] };
      const device = data.devices.find((d) => d.deviceId === deviceId);
      const session = device?.sessions.find((s) => s.id === sessionId);

      if (session?.webPort == null) {
        setStartingSessionIds((prev) => new Set(prev).add(sessionId));
        await fetch("/api/sessions/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ deviceId, sessionId }),
        });
        await pollForWebPort(deviceId, sessionId);
        setStartingSessionIds((prev) => {
          const next = new Set(prev);
          next.delete(sessionId);
          return next;
        });
      }
    },
    []
  );

  const closeTab = useCallback((sessionId: string) => {
    setOpenTabs((prev) => {
      const idx = prev.findIndex((t) => t.sessionId === sessionId);
      const next = prev.filter((t) => t.sessionId !== sessionId);
      setActiveTab((current) => {
        if (current !== sessionId) return current;
        if (next.length === 0) return null;
        const newIdx = Math.min(idx, next.length - 1);
        return next[newIdx]?.sessionId ?? null;
      });
      return next;
    });
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "#030712",
      }}
    >
      <DeviceSidebar
        onOpenSession={openSession}
        startingSessionIds={startingSessionIds}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <SessionTabs
          tabs={openTabs}
          activeTab={activeTab}
          onSelect={setActiveTab}
          onClose={closeTab}
        />

        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {openTabs.length === 0 ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: "12px",
                color: "#374151",
              }}
            >
              <div style={{ fontSize: "40px" }}>⌨</div>
              <div style={{ fontSize: "14px" }}>Select a session from the sidebar</div>
            </div>
          ) : (
            openTabs.map((tab) => (
              <SessionIframe
                key={tab.sessionId}
                deviceId={tab.deviceId}
                sessionId={tab.sessionId}
                isActive={tab.sessionId === activeTab}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
