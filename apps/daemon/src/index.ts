import { loadConfig } from "./config";
import { logger } from "./logger";
import { CommandCenterClient } from "./ws-client";
import { HeartbeatSender } from "./heartbeat";
import type { ServerMessage } from "@opencode-cc/shared";

async function main() {
  logger.info("OpenCode Command Center — Agent Daemon v0.2.0");

  const config = loadConfig();
  logger.info(`Device: ${config.deviceName} (${config.deviceId})`);

  // Initialize WS client
  const client = new CommandCenterClient(config);

  // Initialize heartbeat
  const heartbeat = new HeartbeatSender(client, config);

  // Handle messages from Command Center
  client.onMessage(async (msg: ServerMessage) => {
    switch (msg.type) {
      case "register_ack": {
        if (msg.success) {
          logger.info("Registration successful");
          heartbeat.start();
        } else {
          logger.error(`Registration failed: ${msg.error}`);
          process.exit(1);
        }
        break;
      }

      case "heartbeat_ack": {
        // Heartbeat acknowledged — all good
        break;
      }

      default: {
        logger.info(`[Daemon] Unhandled message type: ${(msg as ServerMessage).type}`);
        break;
      }
    }
  });

  // Connect to Command Center
  await client.connect();

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    heartbeat.stop();
    client.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  logger.info("Daemon running. Press Ctrl+C to stop.");
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
