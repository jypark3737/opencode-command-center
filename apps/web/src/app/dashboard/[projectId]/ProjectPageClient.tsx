"use client";

import { useState } from "react";
import { trpcReact } from "@/lib/trpc-client";
import { TaskList } from "@/components/tasks/TaskList";
import { ProjectSettings } from "@/components/projects/ProjectSettings";
import type { VerificationType } from "@opencode-cc/shared";

interface ProjectPageClientProps {
  projectId: string;
}

export function ProjectPageClient({ projectId }: ProjectPageClientProps) {
  const [showSettings, setShowSettings] = useState(false);
  const { data: project } = trpcReact.projects.get.useQuery({ id: projectId });

  return (
    <div>
      {/* Settings toggle */}
      <div style={{ padding: "16px 24px 0", maxWidth: 720 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              background: showSettings ? "rgba(99,102,241,0.10)" : "transparent",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              color: showSettings ? "#6366f1" : "#888",
              cursor: "pointer",
              fontSize: 12,
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => {
              if (!showSettings) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#3a3a3a";
                (e.currentTarget as HTMLButtonElement).style.color = "#aaa";
              }
            }}
            onMouseLeave={(e) => {
              if (!showSettings) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a";
                (e.currentTarget as HTMLButtonElement).style.color = "#888";
              }
            }}
          >
            <span style={{ fontSize: 14 }}>⚙</span>
            Settings
          </button>
        </div>

        {showSettings && project && (
          <div style={{ marginTop: 12 }}>
            <ProjectSettings
              projectId={projectId}
              currentVerificationType={project.verificationType as VerificationType}
              currentVerifyCommand={project.verifyCommand}
              onClose={() => setShowSettings(false)}
            />
          </div>
        )}
      </div>

      <TaskList projectId={projectId} />
    </div>
  );
}
