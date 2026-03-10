"use client";

import { useState } from "react";

interface TaskCreateFormProps {
  projectId: string;
  onSubmit: (title: string, description: string) => Promise<void>;
}

export function TaskCreateForm({ onSubmit }: TaskCreateFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onSubmit(title.trim(), description.trim());
      setTitle("");
      setDescription("");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: "10px 16px",
          background: "transparent",
          border: "1px dashed #2a2a2a",
          borderRadius: 8,
          color: "#555",
          cursor: "pointer",
          fontSize: 13,
          textAlign: "left",
          transition: "border-color 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#6366f1";
          (e.currentTarget as HTMLButtonElement).style.color = "#6366f1";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a";
          (e.currentTarget as HTMLButtonElement).style.color = "#555";
        }}
      >
        + Add task
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#1a1a1a",
        border: "1px solid #6366f1",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title..."
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          borderBottom: "1px solid #2a2a2a",
          color: "#fff",
          fontSize: 14,
          fontWeight: 500,
          padding: "0 0 8px",
          marginBottom: 8,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description / instructions for opencode (optional)..."
        rows={3}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          color: "#aaa",
          fontSize: 13,
          padding: 0,
          resize: "vertical",
          outline: "none",
          fontFamily: "inherit",
          boxSizing: "border-box",
          marginBottom: 12,
        }}
      />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            padding: "6px 12px",
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
          disabled={loading || !title.trim()}
          style={{
            padding: "6px 14px",
            background: "#6366f1",
            border: "none",
            borderRadius: 6,
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 500,
            opacity: loading || !title.trim() ? 0.6 : 1,
          }}
        >
          {loading ? "Adding..." : "Add Task"}
        </button>
      </div>
    </form>
  );
}
