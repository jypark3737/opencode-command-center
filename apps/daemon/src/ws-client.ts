import WebSocket from "ws";
import type {
  ServerMessage,
  ClientMessage,
  RegisterMessage,
} from "@opencode-cc/shared";
import { logger } from "./logger";
import type { DaemonConfig } from "./config";

export class CommandCenterClient {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private readonly maxDelay = 30000;
  private config: DaemonConfig;
  private messageHandler: ((msg: ServerMessage) => void) | null = null;
  private connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: DaemonConfig) {
    this.config = config;
  }

  onMessage(handler: (msg: ServerMessage) => void): void {
    this.messageHandler = handler;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`Connecting to ${this.config.commandCenterUrl}`);

      this.ws = new WebSocket(this.config.commandCenterUrl);

      this.ws.on("open", () => {
        logger.info("Connected to Command Center");
        this.connected = true;
        this.reconnectDelay = 1000; // Reset backoff
        this.sendRegister();
        resolve();
      });

      this.ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString()) as ServerMessage;
          this.messageHandler?.(msg);
        } catch (err) {
          logger.error("Failed to parse server message", err);
        }
      });

      this.ws.on("close", () => {
        this.connected = false;
        logger.warn(
          `Disconnected from Command Center. Reconnecting in ${this.reconnectDelay}ms`
        );
        this.scheduleReconnect();
      });

      this.ws.on("error", (err) => {
        logger.error("WebSocket error", err.message);
        if (!this.connected) reject(err);
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch {
        // Will retry via close handler
      }
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      logger.warn("Cannot send message — not connected");
    }
  }

  private sendRegister(): void {
    const msg: RegisterMessage = {
      type: "register",
      deviceId: this.config.deviceId,
      deviceName: this.config.deviceName,
      hostname: this.config.hostname,
      apiKey: this.config.apiKey,
      projects: this.config.projects,
    };
    this.send(msg);
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
  }
}
