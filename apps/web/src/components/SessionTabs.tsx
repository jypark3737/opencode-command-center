"use client";

export interface Tab {
  deviceId: string;
  sessionId: string;
  title: string;
  deviceName: string;
}

interface SessionTabsProps {
  tabs: Tab[];
  activeTab: string | null;
  onSelect: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
}

export default function SessionTabs({ tabs, activeTab, onSelect, onClose }: SessionTabsProps) {
  if (tabs.length === 0) {
    return (
      <div
        style={{
          height: "40px",
          background: "#111827",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          paddingLeft: "16px",
          fontSize: "12px",
          color: "#374151",
          userSelect: "none",
        }}
      >
        No open sessions
      </div>
    );
  }

  return (
    <div
      style={{
        height: "40px",
        background: "#111827",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "stretch",
        overflowX: "auto",
        overflowY: "hidden",
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.sessionId === activeTab;
        return (
          <div
            key={tab.sessionId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0",
              flexShrink: 0,
              borderRight: "1px solid var(--border)",
              borderBottom: isActive ? "2px solid #60a5fa" : "2px solid transparent",
              background: isActive ? "#1f2937" : "#111827",
              transition: "background 0.1s",
            }}
          >
            <button
              onClick={() => onSelect(tab.sessionId)}
              style={{
                padding: "0 8px 0 12px",
                height: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: isActive ? "#e5e7eb" : "#9ca3af",
                fontSize: "12px",
                fontWeight: isActive ? 500 : 400,
                whiteSpace: "nowrap",
                maxWidth: "200px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                transition: "color 0.1s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = "#d1d5db";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af";
                }
              }}
            >
              {tab.title} — {tab.deviceName}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.sessionId);
              }}
              style={{
                padding: "0 8px",
                height: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#4b5563",
                fontSize: "14px",
                lineHeight: 1,
                transition: "color 0.1s",
                display: "flex",
                alignItems: "center",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#4b5563";
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
