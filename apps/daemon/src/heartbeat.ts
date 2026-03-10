import type { CommandCenterClient } from "./ws-client";
import { logger } from "./logger";
import type { DaemonConfig } from "./config";

export class HeartbeatSender {
  private timer: ReturnType<typeof setInterval> | null = null;
  private client: CommandCenterClient;
  private config: DaemonConfig;
  private activeTaskId: string | null = null;

  constructor(client: CommandCenterClient, config: DaemonConfig) {
    this.client = client;
    this.config = config;
  }

  setActiveTask(taskId: string | null): void {
    this.activeTaskId = taskId;
  }

  start(): void {
    this.timer = setInterval(() => {
      this.client.send({
        type: "heartbeat",
        deviceId: this.config.deviceId,
        timestamp: Date.now(),
        opencodeRunning: true,
        activeTaskId: this.activeTaskId,
      });
    }, 30_000);

    logger.info("Heartbeat started (30s interval)");
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
