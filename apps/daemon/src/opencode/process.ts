import { spawn, type Subprocess } from "bun";
import { logger } from "../logger";

export class OpenCodeProcess {
  private proc: Subprocess | null = null;
  private port: number;
  private opencodeBin: string;
  private crashHandler: (() => void) | null = null;
  private restartCount = 0;
  private readonly maxRestarts = 3;

  constructor(opencodeBin: string = "opencode") {
    this.opencodeBin = opencodeBin;
    // Pick a random port between 10000-20000
    this.port = Math.floor(Math.random() * 10000) + 10000;
  }

  getPort(): number {
    return this.port;
  }

  async start(): Promise<void> {
    logger.info(`Starting opencode serve on port ${this.port}`);

    this.proc = spawn([this.opencodeBin, "serve", "--port", String(this.port)], {
      stdout: "pipe",
      stderr: "pipe",
    });

    // Wait for opencode to be ready
    await this.waitForReady();
    logger.info(`opencode ready on port ${this.port}`);

    // Monitor for crashes
    this.proc.exited.then((code) => {
      logger.warn(`opencode process exited with code ${code}`);
      if (this.crashHandler) this.crashHandler();
      this.handleCrash();
    });
  }

  private async waitForReady(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(`http://localhost:${this.port}/`);
        if (res.ok || res.status === 404) return; // Any response means it's up
      } catch {
        // Not ready yet
      }
      await Bun.sleep(500);
    }
    throw new Error(`opencode did not start within ${maxAttempts * 0.5}s`);
  }

  private async handleCrash(): Promise<void> {
    if (this.restartCount >= this.maxRestarts) {
      logger.error(`opencode crashed ${this.maxRestarts} times, giving up`);
      return;
    }
    this.restartCount++;
    logger.info(`Restarting opencode (attempt ${this.restartCount})`);
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
    this.crashHandler = handler;
  }
}
