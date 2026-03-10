import type { SubTodoUpdate, FileChange } from "@opencode-cc/shared";
import type { OpenCodeSQLiteReader } from "./opencode/sqlite-reader";
import { exportSession, type ExportResult } from "./opencode/exporter";
import { logger } from "./logger";

export interface TaskAssignment {
  taskId: string;
  sessionId: string;
  projectPath: string;
  title: string;
  description: string;
  verification: { type: string; command?: string };
}

export interface TaskCallbacks {
  onTaskStarted: (taskId: string, sessionId: string) => void;
  onSubTodosUpdated: (taskId: string, subTodos: SubTodoUpdate[]) => void;
  onTaskCompleted: (
    taskId: string,
    sessionId: string,
    result: {
      summary: string;
      filesChanged: FileChange[];
      tokensUsed: number;
      durationMs: number;
      fullTranscript: unknown;
    }
  ) => void;
  onTaskFailed: (taskId: string, error: string) => void;
}

export interface TaskResult {
  exportResult: ExportResult;
  durationMs: number;
  opencodeSessionId: string;
}

export class TaskRunner {
  private opencodeBin: string;
  private sqliteReader: OpenCodeSQLiteReader;

  constructor(opencodeBin: string, sqliteReader: OpenCodeSQLiteReader) {
    this.opencodeBin = opencodeBin;
    this.sqliteReader = sqliteReader;
  }

  async runTask(
    assignment: TaskAssignment,
    callbacks: TaskCallbacks
  ): Promise<TaskResult> {
    const startTime = Date.now();

    logger.info(`Starting task: ${assignment.title}`);

    const prompt = buildPrompt(assignment);

    // Run opencode via CLI (non-interactive mode)
    const opencodeSessionId = await this.runOpenCode(
      prompt,
      assignment.projectPath
    );

    // Notify server task started
    callbacks.onTaskStarted(assignment.taskId, opencodeSessionId);

    // Start subtodo polling
    let subtodoPoller: ReturnType<typeof setInterval> | null = null;
    let lastHash = "";

    subtodoPoller = setInterval(() => {
      const subTodos = this.sqliteReader.getSubTodos(opencodeSessionId);
      const hash = JSON.stringify(subTodos);

      if (hash !== lastHash) {
        lastHash = hash;
        callbacks.onSubTodosUpdated(assignment.taskId, subTodos);
      }
    }, 5000);

    try {
      // Wait for opencode to complete
      await this.waitForCompletion(opencodeSessionId);

      // Stop polling
      if (subtodoPoller) {
        clearInterval(subtodoPoller);
        subtodoPoller = null;
      }

      // Export results
      const exportResult = await exportSession(
        this.opencodeBin,
        opencodeSessionId
      );
      const durationMs = Date.now() - startTime;

      logger.info(
        `Task completed: ${assignment.title} in ${durationMs}ms`
      );

      return { exportResult, durationMs, opencodeSessionId };
    } catch (err) {
      if (subtodoPoller) {
        clearInterval(subtodoPoller);
      }
      throw err;
    }
  }

  private async runOpenCode(
    prompt: string,
    projectPath: string
  ): Promise<string> {
    const proc = Bun.spawn(
      [this.opencodeBin, "run", prompt, "--cwd", projectPath],
      {
        stdout: "pipe",
        stderr: "pipe",
        cwd: projectPath,
      }
    );

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`opencode run failed (exit ${exitCode}): ${stderr}`);
    }

    // Extract session ID from output — last line
    const lines = output.trim().split("\n");
    const sessionId = lines[lines.length - 1]?.trim();

    if (!sessionId) {
      throw new Error("opencode run did not output a session ID");
    }

    return sessionId;
  }

  private async waitForCompletion(sessionId: string): Promise<void> {
    const maxWait = 60 * 60 * 1000; // 1 hour max
    const pollInterval = 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      await Bun.sleep(pollInterval);

      try {
        const proc = Bun.spawn(
          [this.opencodeBin, "export", sessionId],
          { stdout: "pipe", stderr: "pipe" }
        );
        const output = await new Response(proc.stdout).text();
        await proc.exited;

        if (output.trim()) {
          const data = JSON.parse(output);
          if (data && typeof data === "object") {
            return;
          }
        }
      } catch {
        // Session not done yet, keep polling
      }
    }

    throw new Error(`Task timed out after ${maxWait / 1000}s`);
  }
}

function buildPrompt(assignment: TaskAssignment): string {
  return `# Task: ${assignment.title}

${assignment.description}

Working directory: ${assignment.projectPath}

Please complete this task thoroughly. When done, provide a clear summary of:
1. What you did
2. Which files you changed and why
3. Any important decisions you made

Use your todo list to track progress on subtasks.`;
}
