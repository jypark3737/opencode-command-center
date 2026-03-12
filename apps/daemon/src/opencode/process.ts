import { spawn, type Subprocess } from "bun";
import { logger } from "../logger";

export class OpenCodeProcess {
  private proc: Subprocess | null = null;
  private port: number;
  private opencodeBin: string;
  private projectPath: string;
  private sessionId: string | undefined;
  private restartCount = 0;
  private readonly maxRestarts = 3;
  private onCrashHandler: (() => void) | null = null;

  constructor(opencodeBin: string, projectPath: string, port?: number, sessionId?: string) {
    this.opencodeBin = opencodeBin;
    this.projectPath = projectPath;
    this.port = port ?? Math.floor(Math.random() * 10000) + 10000;
    this.sessionId = sessionId;
  }

  getPort(): number {
    return this.port;
  }

  getProjectPath(): string {
    return this.projectPath;
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  async start(): Promise<void> {
    logger.info(
      `Starting opencode web on port ${this.port} for ${this.projectPath}`
    );

    this.proc = spawn(
      [this.opencodeBin, "web", "--port", String(this.port), "--hostname", "127.0.0.1"],
      {
        stdout: "pipe",
        stderr: "pipe",
        cwd: this.projectPath,
      }
    );

    await this.waitForReady();
    logger.info(`opencode web ready on port ${this.port}`);

    this.proc.exited.then((code) => {
      logger.warn(
        `opencode web process (port ${this.port}) exited with code ${code}`
      );
      if (this.onCrashHandler) this.onCrashHandler();
      this.handleCrash();
    });
  }

  private async waitForReady(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/`);
        if (res.status === 200 || res.status === 401 || res.status === 404) return;
      } catch {
      }
      await Bun.sleep(500);
    }
    throw new Error(`opencode web did not start within ${maxAttempts * 0.5}s`);
  }

  private async handleCrash(): Promise<void> {
    if (this.restartCount >= this.maxRestarts) {
      logger.error(
        `opencode web (port ${this.port}) crashed ${this.maxRestarts} times, giving up`
      );
      return;
    }
    this.restartCount++;
    logger.info(
      `Restarting opencode web on port ${this.port} (attempt ${this.restartCount})`
    );
    await Bun.sleep(2000);
    await this.start();
  }

  async stop(): Promise<void> {
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
    }
  }

  isRunning(): boolean {
    return this.proc !== null;
  }

  onCrash(handler: () => void): void {
    this.onCrashHandler = handler;
  }
}
