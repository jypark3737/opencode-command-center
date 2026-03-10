"use client";

import { useState, useEffect } from "react";
import { trpcReact } from "@/lib/trpc-client";
import type { VerificationType } from "@opencode-cc/shared";

const VERIFICATION_OPTIONS: Array<{
  value: VerificationType;
  label: string;
  description: string;
}> = [
  { value: "NONE", label: "None", description: "Trust OpenCode (no verification)" },
  { value: "BUILD", label: "Build", description: "Run build command after completion" },
  { value: "LLM", label: "LLM", description: "AI review of changes" },
  { value: "BUILD_AND_LLM", label: "Both", description: "Build check + AI review" },
];

interface ProjectSettingsProps {
  projectId: string;
  currentVerificationType: VerificationType;
  currentVerifyCommand: string | null;
  onClose: () => void;
}

export function ProjectSettings({
  projectId,
  currentVerificationType,
  currentVerifyCommand,
  onClose,
}: ProjectSettingsProps) {
  const utils = trpcReact.useUtils();
  const [verificationType, setVerificationType] = useState<VerificationType>(currentVerificationType);
  const [verifyCommand, setVerifyCommand] = useState(currentVerifyCommand ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateProject = trpcReact.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.get.invalidate({ id: projectId });
      utils.projects.list.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  // Reset when props change
  useEffect(() => {
    setVerificationType(currentVerificationType);
    setVerifyCommand(currentVerifyCommand ?? "");
  }, [currentVerificationType, currentVerifyCommand]);

  const showBuildInput = verificationType === "BUILD" || verificationType === "BUILD_AND_LLM";

  async function handleSave() {
    setSaving(true);
    try {
      await updateProject.mutateAsync({
        id: projectId,
        verificationType,
        verifyCommand: showBuildInput ? verifyCommand : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: 8,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#e5e5e5" }}>
          Verification Settings
        </h3>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#555",
            cursor: "pointer",
            fontSize: 16,
            padding: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Verification type selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {VERIFICATION_OPTIONS.map((opt) => {
          const isSelected = verificationType === opt.value;
          return (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 6,
                cursor: "pointer",
                background: isSelected ? "rgba(99,102,241,0.08)" : "transparent",
                border: isSelected ? "1px solid rgba(99,102,241,0.25)" : "1px solid transparent",
                transition: "all 0.12s",
              }}
            >
              <input
                type="radio"
                name="verificationType"
                value={opt.value}
                checked={isSelected}
                onChange={() => setVerificationType(opt.value)}
                style={{ accentColor: "#6366f1" }}
              />
              <div>
                <div style={{ fontSize: 13, color: isSelected ? "#e5e5e5" : "#aaa", fontWeight: 500 }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>
                  {opt.description}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Build command input */}
      {showBuildInput && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>
            Build command
          </label>
          <input
            value={verifyCommand}
            onChange={(e) => setVerifyCommand(e.target.value)}
            placeholder="e.g. bun run typecheck"
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
              fontFamily: "monospace",
            }}
          />
        </div>
      )}

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "7px 16px",
            background: "#6366f1",
            border: "none",
            borderRadius: 6,
            color: "#fff",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 500,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && (
          <span style={{ fontSize: 12, color: "#22c55e" }}>
            ✓ Saved
          </span>
        )}
      </div>
    </div>
  );
}
