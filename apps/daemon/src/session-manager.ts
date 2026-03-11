import type { DaemonConfig } from "./config";
import type { CommandCenterClient } from "./ws-client";
import type { FileChange } from "@opencode-cc/shared";
import { OpenCodeProcess } from "./opencode/process";
import { OpenCodeSQLiteReader, type DiscoveredSession } from "./opencode/sqlite-reader";
import { TaskRunner, type TaskAssignment } from "./task-runner";
import { TaskVerifier } from "./verifier";
import { logger } from "./logger";

export interface ManagedSession {
  serverSessionId: string;
  opencodeSessionId?: string;
  projectPath: string;
  port?: number;
  process?: OpenCodeProcess;
  status: "IDLE" | "BUSY" | "DEAD";
  currentTaskId?: string;
}

export class SessionManager {
  private sessions: Map<string, ManagedSession> = new Map();
  private config: DaemonConfig;
  private client: CommandCenterClient;
  private sqliteReader: OpenCodeSQLiteReader;
  private taskRunner: TaskRunner;
  private verifier: TaskVerifier;

  constructor(config: DaemonConfig, client: CommandCenterClient) {
    this.config = config;
    this.client = client;
    this.sqliteReader = new OpenCodeSQLiteReader(config.opencodeDbPath);
    this.sqliteReader.connect();
    this.taskRunner = new TaskRunner(config.opencodeBin, this.sqliteReader);
    this.verifier = new TaskVerifier(config.opencodeBin);
  }

  /**
   * Discover existing OpenCode sessions by reading the SQLite DB.
   */
  async discoverSessions(): Promise<DiscoveredSession[]> {
    logger.info("Discovering existing OpenCode sessions...");
    let discovered = this.sqliteReader.discoverSessions();

    if (this.config.projectsFilter.length > 0) {
      discovered = discovered.filter((s) =>
        this.config.projectsFilter.some((prefix) => s.projectPath.startsWith(prefix))
      );
      logger.info(`Filtered to ${discovered.length} session(s) matching project filter`);
    }

    logger.info(`Found ${discovered.length} existing session(s)`);
    return discovered;
  }

  /**
   * Create a new OpenCode session for a project path.
   * Starts `opencode serve` and tracks in the session map.
   */
  async createSession(
    serverSessionId: string,
    projectPath: string
  ): Promise<void> {
    logger.info(
      `Creating session ${serverSessionId} for project ${projectPath}`
    );

    if (this.sessions.has(serverSessionId)) {
      logger.warn(`Session ${serverSessionId} already exists, skipping`);
      return;
    }

    const port = Math.floor(Math.random() * 10000) + 10000;
    const proc = new OpenCodeProcess(
      this.config.opencodeBin,
      projectPath,
      port
    );

    const session: ManagedSession = {
      serverSessionId,
      projectPath,
      port,
      process: proc,
      status: "IDLE",
    };

    this.sessions.set(serverSessionId, session);

    try {
      await proc.start();

      proc.onCrash(() => {
        logger.warn(`Session ${serverSessionId} process crashed`);
        session.status = "DEAD";
        this.client.send({
          type: "session_status",
          deviceId: this.config.deviceId,
          sessionId: serverSessionId,
          status: "DEAD",
        });
      });

      logger.info(
        `Session ${serverSessionId} created on port ${port}`
      );
    } catch (err) {
      session.status = "DEAD";
      const error = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to create session ${serverSessionId}: ${error}`);
      this.client.send({
        type: "session_status",
        deviceId: this.config.deviceId,
        sessionId: serverSessionId,
        status: "DEAD",
      });
    }
  }

  /**
   * Route a task to a specific session and execute it.
   */
  async executeTask(
    serverSessionId: string,
    task: TaskAssignment
  ): Promise<void> {
    const session = this.sessions.get(serverSessionId);

    if (!session) {
      // Create session on-the-fly if it doesn't exist yet
      logger.info(
        `Session ${serverSessionId} not found locally, creating on demand`
      );
      await this.createSession(serverSessionId, task.projectPath);
    }

    const managedSession = this.sessions.get(serverSessionId);
    if (!managedSession || managedSession.status === "DEAD") {
      throw new Error(
        `Session ${serverSessionId} is not available (status: ${managedSession?.status ?? "missing"})`
      );
    }

    if (managedSession.status === "BUSY") {
      throw new Error(
        `Session ${serverSessionId} is busy with task ${managedSession.currentTaskId}`
      );
    }

    managedSession.status = "BUSY";
    managedSession.currentTaskId = task.taskId;

    this.client.send({
      type: "session_status",
      deviceId: this.config.deviceId,
      sessionId: serverSessionId,
      status: "BUSY",
    });

    try {
      const result = await this.taskRunner.runTask(task, {
        onTaskStarted: (taskId, opencodeSessionId) => {
          managedSession.opencodeSessionId = opencodeSessionId;
          this.client.send({
            type: "task_started",
            taskId,
            deviceId: this.config.deviceId,
            opencodeSessionId,
            timestamp: Date.now(),
          });
        },
        onSubTodosUpdated: (taskId, subTodos) => {
          this.client.send({
            type: "subtodos_updated",
            taskId,
            deviceId: this.config.deviceId,
            subTodos,
          });
        },
        onTaskCompleted: () => {
          // Handled below after verification
        },
        onTaskFailed: (taskId, error) => {
          this.client.send({
            type: "task_failed",
            taskId,
            deviceId: this.config.deviceId,
            error,
            timestamp: Date.now(),
          });
        },
      });

      // Run verification
      const verificationOutcome = await this.verifier.verify(
        task.verification,
        task.projectPath,
        result.exportResult
      );

      // Send verification result
      this.client.send({
        type: "task_verification",
        taskId: task.taskId,
        deviceId: this.config.deviceId,
        verification: {
          passed: verificationOutcome.passed,
          type: verificationOutcome.type,
          buildOutput: verificationOutcome.buildOutput,
          llmVerdict: verificationOutcome.llmVerdict,
          llmNotes: verificationOutcome.llmNotes,
        },
      });

      // Send task completed
      this.client.send({
        type: "task_completed",
        taskId: task.taskId,
        deviceId: this.config.deviceId,
        opencodeSessionId: result.opencodeSessionId,
        result: {
          summary: result.exportResult.summary,
          filesChanged: result.exportResult.filesChanged as FileChange[],
          tokensUsed: result.exportResult.tokensUsed,
          durationMs: result.durationMs,
          fullTranscript: result.exportResult.fullTranscript,
        },
        timestamp: Date.now(),
      });

      logger.info(`Task ${task.taskId} completed with verification: ${verificationOutcome.type} = ${verificationOutcome.passed ? "PASS" : "FAIL"}`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.error(`Task ${task.taskId} failed: ${error}`);
      this.client.send({
        type: "task_failed",
        taskId: task.taskId,
        deviceId: this.config.deviceId,
        error,
        timestamp: Date.now(),
      });
    } finally {
      managedSession.status = "IDLE";
      managedSession.currentTaskId = undefined;

      this.client.send({
        type: "session_status",
        deviceId: this.config.deviceId,
        sessionId: serverSessionId,
        status: "IDLE",
      });
    }
  }

  /**
   * Get a managed session by its server-assigned ID.
   */
  getSession(serverSessionId: string): ManagedSession | undefined {
    return this.sessions.get(serverSessionId);
  }

  /**
   * Stop all managed sessions and clean up.
   */
  async stopAll(): Promise<void> {
    logger.info(`Stopping ${this.sessions.size} managed session(s)...`);
    const stopPromises: Promise<void>[] = [];

    for (const [id, session] of this.sessions) {
      if (session.process) {
        logger.info(`Stopping session ${id}`);
        stopPromises.push(session.process.stop());
      }
    }

    await Promise.all(stopPromises);
    this.sessions.clear();
    this.sqliteReader.close();
    logger.info("All sessions stopped");
  }
}
