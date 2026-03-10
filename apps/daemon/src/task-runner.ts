import type { AssignTaskMessage } from "@opencode-cc/shared";
import type { OpenCodeProcess } from "./opencode/process";
import type { OpenCodeSQLiteReader } from "./opencode/sqlite-reader";
import { exportSession } from "./opencode/exporter";
import { logger } from "./logger";

export interface TaskRunnerDeps {
  opencode: OpenCodeProcess;
  sqliteReader: OpenCodeSQLiteReader;
  opencodeBin: string;
  onTaskStarted: (taskId: string, sessionId: string) => void;
  onSubTodosUpdated: (
    taskId: string,
    subTodos: Array<{ content: string; checked: boolean; position: number }>
  ) => void;
  onTaskCompleted: (
    taskId: string,
    sessionId: string,
    result: {
      summary: string;
      filesChanged: unknown[];
      tokensUsed: number;
      durationMs: number;
      fullTranscript: unknown;
    }
  ) => void;
  onTaskFailed: (taskId: string, error: string) => void;
}

export class TaskRunner {
  private deps: TaskRunnerDeps;
  private currentTaskId: string | null = null;
  private subtodoPoller: ReturnType<typeof setInterval> | null = null;

  constructor(deps: TaskRunnerDeps) {
    this.deps = deps;
  }

  isRunning(): boolean {
    return this.currentTaskId !== null;
  }

  async runTask(assignment: AssignTaskMessage): Promise<void> {
    if (this.currentTaskId) {
      logger.warn(
        `Already running task ${this.currentTaskId}, ignoring ${assignment.taskId}`
      );
      return;
    }

    this.currentTaskId = assignment.taskId;
    const startTime = Date.now();

    try {
      logger.info(`Starting task: ${assignment.title}`);

      // Build prompt
      const prompt = buildPrompt(assignment);

      // Run opencode via CLI (non-interactive mode)
      const sessionId = await this.runOpenCode(prompt, assignment.projectPath);

      // Notify server task started
      this.deps.onTaskStarted(assignment.taskId, sessionId);

      // Start subtodo polling
      this.startSubtodoPolling(assignment.taskId, sessionId);

      // Wait for opencode to complete
      await this.waitForCompletion(sessionId);

      // Stop polling
      this.stopSubtodoPolling();

      // Export results
      const result = await exportSession(this.deps.opencodeBin, sessionId);

      const durationMs = Date.now() - startTime;

      this.deps.onTaskCompleted(assignment.taskId, sessionId, {
        ...result,
        durationMs,
        filesChanged: result.filesChanged,
      });

      logger.info(`Task completed: ${assignment.title} in ${durationMs}ms`);
    } catch (err) {
      this.stopSubtodoPolling();
      const error = err instanceof Error ? err.message : String(err);
      logger.error(`Task failed: ${assignment.title}`, error);
      this.deps.onTaskFailed(assignment.taskId, error);
    } finally {
      this.currentTaskId = null;
    }
  }

  private async runOpenCode(
    prompt: string,
    projectPath: string
  ): Promise<string> {
    // Use opencode run for non-interactive execution
    // opencode run "<prompt>" --cwd <path> outputs session ID
    const proc = Bun.spawn(
      [this.deps.opencodeBin, "run", prompt, "--cwd", projectPath],
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

    // Extract session ID from output
    // opencode run outputs the session ID on the last line
    const lines = output.trim().split("\n");
    const sessionId = lines[lines.length - 1]?.trim();

    if (!sessionId) {
      throw new Error("opencode run did not output a session ID");
    }

    return sessionId;
  }

  private async waitForCompletion(sessionId: string): Promise<void> {
    // Poll until session is no longer active
    // opencode export returns data when session is done
    const maxWait = 60 * 60 * 1000; // 1 hour max
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      await Bun.sleep(pollInterval);

      // Check if session is complete by trying to export
      try {
        const proc = Bun.spawn(
          [this.deps.opencodeBin, "export", sessionId],
          { stdout: "pipe", stderr: "pipe" }
        );
        const output = await new Response(proc.stdout).text();
        await proc.exited;

        if (output.trim()) {
          const data = JSON.parse(output);
          // If we got valid export data, session is complete
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

  private startSubtodoPolling(taskId: string, sessionId: string): void {
    let lastHash = "";

    this.subtodoPoller = setInterval(() => {
      const subTodos = this.deps.sqliteReader.getSubTodos(sessionId);
      const hash = JSON.stringify(subTodos);

      if (hash !== lastHash) {
        lastHash = hash;
        this.deps.onSubTodosUpdated(taskId, subTodos);
      }
    }, 5000);
  }

  private stopSubtodoPolling(): void {
    if (this.subtodoPoller) {
      clearInterval(this.subtodoPoller);
      this.subtodoPoller = null;
    }
  }
}

function buildPrompt(assignment: AssignTaskMessage): string {
  return `# Task: ${assignment.title}

${assignment.description}

Working directory: ${assignment.projectPath}

Please complete this task thoroughly. When done, provide a clear summary of:
1. What you did
2. Which files you changed and why
3. Any important decisions you made

Use your todo list to track progress on subtasks.`;
}
