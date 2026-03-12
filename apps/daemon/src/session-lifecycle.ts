import { logger } from "./logger";
import { OpenCodeProcess } from "./opencode/process";
import type { OpenCodeSQLiteReader } from "./opencode/sqlite-reader";
import type { DaemonConfig } from "./config";

export interface SessionInfo {
  id: string;
  title?: string;
  directory: string;
  timeCreated: string;
}

export class SessionLifecycle {
  private processes: Map<string, OpenCodeProcess> = new Map();
  private idleTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly IDLE_TIMEOUT = 30 * 60 * 1000;
  private readonly MAX_PROCESSES = 10;

  constructor(
    private sqliteReader: OpenCodeSQLiteReader,
    private config: DaemonConfig
  ) {}

  listSessions(): SessionInfo[] {
    const sessions = this.sqliteReader.getAllSessionsWithTitles();
    const filtered =
      this.config.projectsFilter.length > 0
        ? sessions.filter((s) =>
            this.config.projectsFilter.some((f) => s.directory.startsWith(f))
          )
        : sessions;

    return filtered.map((s) => ({
      id: s.id,
      title: s.title,
      directory: s.directory,
      timeCreated: s.timeCreated,
    }));
  }

  async startSession(sessionId: string): Promise<number> {
    const existing = this.processes.get(sessionId);
    if (existing) {
      logger.info(`[Lifecycle] Session ${sessionId} already running on port ${existing.getPort()}`);
      this.touchSession(sessionId);
      return existing.getPort();
    }

    if (this.processes.size >= this.MAX_PROCESSES) {
      throw new Error(
        `Maximum concurrent sessions (${this.MAX_PROCESSES}) reached. Stop an existing session first.`
      );
    }

    const sessions = this.sqliteReader.getAllSessionsWithTitles();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found in database`);
    }

    logger.info(`[Lifecycle] Starting session ${sessionId} in ${session.directory}`);

    const proc = new OpenCodeProcess(
      this.config.opencodeBin,
      session.directory,
      undefined,
      sessionId
    );

    proc.onCrash(() => {
      logger.warn(`[Lifecycle] Session ${sessionId} crashed, removing from active processes`);
      this.processes.delete(sessionId);
      this.clearIdleTimer(sessionId);
    });

    await proc.start();

    this.processes.set(sessionId, proc);
    this.touchSession(sessionId);

    const port = proc.getPort();
    logger.info(`[Lifecycle] Session ${sessionId} started on port ${port}`);
    return port;
  }

  async stopSession(sessionId: string): Promise<void> {
    this.clearIdleTimer(sessionId);
    const proc = this.processes.get(sessionId);
    if (proc) {
      logger.info(`[Lifecycle] Stopping session ${sessionId}`);
      await proc.stop();
      this.processes.delete(sessionId);
    }
  }

  touchSession(sessionId: string): void {
    this.clearIdleTimer(sessionId);
    const timer = setTimeout(async () => {
      logger.info(`[Lifecycle] Session ${sessionId} idle timeout (30 min), stopping`);
      await this.stopSession(sessionId);
    }, this.IDLE_TIMEOUT);
    this.idleTimers.set(sessionId, timer);
  }

  private clearIdleTimer(sessionId: string): void {
    const timer = this.idleTimers.get(sessionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.idleTimers.delete(sessionId);
    }
  }

  async stopAll(): Promise<void> {
    const ids = Array.from(this.processes.keys());
    await Promise.all(ids.map((id) => this.stopSession(id)));
  }

  getPort(sessionId: string): number | undefined {
    return this.processes.get(sessionId)?.getPort();
  }
}
