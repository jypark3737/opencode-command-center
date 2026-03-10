import { loadConfig } from "./config";
import { logger } from "./logger";
import { CommandCenterClient } from "./ws-client";
import { HeartbeatSender } from "./heartbeat";
import { SessionManager } from "./session-manager";
import type { ServerMessage } from "@opencode-cc/shared";

async function main() {
  logger.info("OpenCode Command Center — Agent Daemon v0.2.0");

  const config = loadConfig();
  logger.info(`Device: ${config.deviceName} (${config.deviceId})`);

  // Initialize WS client
  const client = new CommandCenterClient(config);

  // Initialize heartbeat
  const heartbeat = new HeartbeatSender(client, config);

  // Initialize session manager
  const sessionManager = new SessionManager(config, client);

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

      case "discover_sessions": {
        const discovered = await sessionManager.discoverSessions();
        client.send({
          type: "sessions_discovered",
          deviceId: config.deviceId,
          sessions: discovered,
        });
        break;
      }

      case "create_session": {
        await sessionManager.createSession(msg.sessionId, msg.projectPath);
        client.send({
          type: "session_status",
          deviceId: config.deviceId,
          sessionId: msg.sessionId,
          status: "IDLE",
        });
        break;
      }

      case "assign_task": {
        // Route to the correct session asynchronously
        sessionManager
          .executeTask(msg.sessionId, {
            taskId: msg.taskId,
            sessionId: msg.sessionId,
            projectPath: msg.projectPath,
            title: msg.title,
            description: msg.description,
            verification: msg.verification,
          })
          .catch((err) => {
            const error = err instanceof Error ? err.message : String(err);
            logger.error(`Task execution error: ${error}`);
            client.send({
              type: "task_failed",
              taskId: msg.taskId,
              deviceId: config.deviceId,
              error,
              timestamp: Date.now(),
            });
          });
        break;
      }

      case "cancel_task": {
        logger.info(`Task cancellation requested: ${msg.taskId}`);
        // TODO: implement cancellation
        break;
      }

      case "heartbeat_ack": {
        // Heartbeat acknowledged — all good
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
    await sessionManager.stopAll();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  logger.info("Daemon running. Press Ctrl+C to stop.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
