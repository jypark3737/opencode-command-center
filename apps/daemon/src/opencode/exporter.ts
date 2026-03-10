import { logger } from "../logger";
import type { FileChange } from "@opencode-cc/shared";

export interface ExportResult {
  summary: string;
  filesChanged: FileChange[];
  tokensUsed: number;
  fullTranscript: unknown;
}

interface OpenCodeMessage {
  role: string;
  parts: Array<{
    type: string;
    text?: string;
    toolName?: string;
    args?: Record<string, unknown>;
    output?: string;
  }>;
}

interface OpenCodeExport {
  session?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  messages?: OpenCodeMessage[];
}

export async function exportSession(
  opencodeBin: string,
  sessionId: string
): Promise<ExportResult> {
  logger.info(`Exporting session ${sessionId}`);

  const proc = Bun.spawn([opencodeBin, "export", sessionId], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const output = await new Response(proc.stdout).text();
  await proc.exited;

  let exportData: OpenCodeExport = {};
  try {
    exportData = JSON.parse(output);
  } catch {
    logger.warn(`Failed to parse opencode export output for ${sessionId}`);
  }

  return {
    summary: extractSummary(exportData),
    filesChanged: extractFilesChanged(exportData),
    tokensUsed: extractTokenCount(exportData),
    fullTranscript: exportData,
  };
}

function extractSummary(data: OpenCodeExport): string {
  const messages = data.messages ?? [];
  // Find the last assistant message with text content
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "assistant") {
      const textPart = msg.parts?.find((p) => p.type === "text" && p.text);
      if (textPart?.text) {
        // Truncate to 2000 chars for summary
        return textPart.text.slice(0, 2000);
      }
    }
  }
  return "Task completed.";
}

function extractFilesChanged(data: OpenCodeExport): FileChange[] {
  const files = new Map<string, FileChange>();
  const messages = data.messages ?? [];

  for (const msg of messages) {
    for (const part of msg.parts ?? []) {
      if (part.type === "tool_result" && part.toolName && part.args) {
        const toolName = part.toolName.toLowerCase();
        if (toolName === "write" || toolName === "writefile") {
          const path = part.args["path"] as string | undefined;
          if (path) {
            files.set(path, {
              path,
              status: files.has(path) ? "modified" : "added",
              additions: 0,
              deletions: 0,
            });
          }
        } else if (toolName === "edit" || toolName === "editfile") {
          const path = part.args["path"] as string | undefined;
          if (path) {
            files.set(path, { path, status: "modified", additions: 0, deletions: 0 });
          }
        }
      }
    }
  }

  return Array.from(files.values());
}

function extractTokenCount(data: OpenCodeExport): number {
  const session = data.session;
  if (!session) return 0;
  return (session.inputTokens ?? 0) + (session.outputTokens ?? 0);
}
