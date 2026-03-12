import { loadConfig } from "./config";
import { logger } from "./logger";
import { CommandCenterClient } from "./ws-client";
import { HeartbeatSender } from "./heartbeat";
import { TunnelHandler } from "./tunnel-handler";
import { OpenCodeSQLiteReader } from "./opencode/sqlite-reader";
import { SessionLifecycle } from "./session-lifecycle";
import type { ServerMessage } from "@opencode-cc/shared";

async function main() {
  logger.info("OpenCode Terminal Hub — Daemon v1.0.0");

  const config = loadConfig();
  logger.info(`Device: ${config.deviceName} (${config.deviceId})`);

  const client = new CommandCenterClient(config);
  const heartbeat = new HeartbeatSender(client, config);
  const tunnelHandler = new TunnelHandler();
  const sqliteReader = new OpenCodeSQLiteReader(config.opencodeDbPath);
  sqliteReader.connect();

  const sessionLifecycle = new SessionLifecycle(sqliteReader, config);

  client.onMessage(async (msg: ServerMessage) => {
    switch (msg.type) {
      case "register_ack": {
        if (msg.success) {
          logger.info("Registration successful");
          heartbeat.start();
          const sessions = sessionLifecycle.listSessions();
          client.send({
            type: "sessions_list",
            deviceId: config.deviceId,
            sessions,
          });
        } else {
          logger.error(`Registration failed: ${msg.error}`);
          process.exit(1);
        }
        break;
      }

      case "heartbeat_ack": {
        break;
      }

      case "list_sessions": {
        const sessions = sessionLifecycle.listSessions();
        client.send({
          type: "sessions_list",
          deviceId: config.deviceId,
          sessions,
        });
        break;
      }

      case "start_session": {
        logger.info(`[Lifecycle] start_session requested for ${msg.sessionId}`);
        try {
          const port = await sessionLifecycle.startSession(msg.sessionId);
          tunnelHandler.registerPort(msg.sessionId, port);
          client.send({
            type: "session_started",
            deviceId: config.deviceId,
            sessionId: msg.sessionId,
            webPort: port,
          });
        } catch (err: unknown) {
          const error = err instanceof Error ? err.message : String(err);
          logger.error(`[Lifecycle] Failed to start session ${msg.sessionId}: ${error}`);
          client.send({
            type: "session_error",
            deviceId: config.deviceId,
            sessionId: msg.sessionId,
            error,
          });
        }
        break;
      }

      case "stop_session": {
        logger.info(`[Lifecycle] stop_session for ${msg.sessionId}`);
        await sessionLifecycle.stopSession(msg.sessionId);
        tunnelHandler.unregisterPort(msg.sessionId);
        break;
      }

      case "tunnel_request": {
        sessionLifecycle.touchSession(msg.sessionId);
        tunnelHandler
          .handleRequest(msg, client, config.deviceId)
          .catch((err: unknown) => {
            const error = err instanceof Error ? err.message : String(err);
            logger.error(`[Tunnel] Handler error: ${error}`);
            client.send({
              type: "tunnel_response_error",
              id: msg.id,
              deviceId: config.deviceId,
              error,
            });
          });
        break;
      }

      default: {
        logger.info(
          `[Daemon] Unhandled message type: ${(msg as ServerMessage).type}`
        );
        break;
      }
    }
  });

  await client.connect();

  const shutdown = async () => {
    logger.info("Shutting down...");
    heartbeat.stop();
    await sessionLifecycle.stopAll();
    client.disconnect();
    sqliteReader.close();
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
