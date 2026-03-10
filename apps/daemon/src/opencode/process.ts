import { spawn, type Subprocess } from "bun";
import { logger } from "../logger";

export class OpenCodeProcess {
  private proc: Subprocess | null = null;
  private port: number;
  private opencodeBin: string;
  private projectPath: string;
  private restartCount = 0;
  private readonly maxRestarts = 3;
  private onCrashHandler: (() => void) | null = null;

  constructor(opencodeBin: string, projectPath: string, port?: number) {
    this.opencodeBin = opencodeBin;
    this.projectPath = projectPath;
    this.port = port ?? Math.floor(Math.random() * 10000) + 10000;
  }

  getPort(): number {
    return this.port;
  }

  getProjectPath(): string {
    return this.projectPath;
  }

  async start(): Promise<void> {
    logger.info(
      `Starting opencode serve on port ${this.port} for ${this.projectPath}`
    );

    this.proc = spawn(
      [this.opencodeBin, "serve", "--port", String(this.port)],
      {
        stdout: "pipe",
        stderr: "pipe",
        cwd: this.projectPath,
      }
    );

    await this.waitForReady();
    logger.info(`opencode ready on port ${this.port}`);

    this.proc.exited.then((code) => {
      logger.warn(
        `opencode process (port ${this.port}) exited with code ${code}`
      );
      if (this.onCrashHandler) this.onCrashHandler();
      this.handleCrash();
    });
  }

  private async waitForReady(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(`http://localhost:${this.port}/`);
        if (res.ok || res.status === 404) return;
      } catch {
        // Not ready yet
      }
      await Bun.sleep(500);
    }
    throw new Error(`opencode did not start within ${maxAttempts * 0.5}s`);
  }

  private async handleCrash(): Promise<void> {
    if (this.restartCount >= this.maxRestarts) {
      logger.error(
        `opencode (port ${this.port}) crashed ${this.maxRestarts} times, giving up`
      );
      return;
    }
    this.restartCount++;
    logger.info(
      `Restarting opencode on port ${this.port} (attempt ${this.restartCount})`
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
