import { loadConfig } from "./config";
import { logger } from "./logger";
import { CommandCenterClient } from "./ws-client";
import { HeartbeatSender } from "./heartbeat";
import { TunnelHandler } from "./tunnel-handler";
import { OpenCodeSQLiteReader } from "./opencode/sqlite-reader";
import type { ServerMessage } from "@opencode-cc/shared";

function buildSessionsList(
  config: { deviceId: string; projectsFilter: string[] },
  sqliteReader: OpenCodeSQLiteReader
) {
  const sessions = sqliteReader.getAllSessionsWithTitles();
  const filtered =
    config.projectsFilter.length > 0
      ? sessions.filter((s) =>
          config.projectsFilter.some((f) => s.directory.startsWith(f))
        )
      : sessions;

  return {
    type: "sessions_list" as const,
    deviceId: config.deviceId,
    sessions: filtered.map((s) => ({
      id: s.id,
      directory: s.directory,
      title: s.title,
      timeCreated: s.timeCreated,
    })),
  };
}

async function main() {
  logger.info("OpenCode Terminal Hub — Daemon v1.0.0");

  const config = loadConfig();
  logger.info(`Device: ${config.deviceName} (${config.deviceId})`);

  const client = new CommandCenterClient(config);
  const heartbeat = new HeartbeatSender(client, config);
  const tunnelHandler = new TunnelHandler();
  const sqliteReader = new OpenCodeSQLiteReader(config.opencodeDbPath);
  sqliteReader.connect();

  client.onMessage(async (msg: ServerMessage) => {
    switch (msg.type) {
      case "register_ack": {
        if (msg.success) {
          logger.info("Registration successful");
          heartbeat.start();
          client.send(buildSessionsList(config, sqliteReader));
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
        client.send(buildSessionsList(config, sqliteReader));
        break;
      }

      case "start_session": {
        // TODO(T8): Implement full session lifecycle — spawn OpenCodeProcess, register port with tunnelHandler
        logger.info(
          `[Tunnel] start_session requested for ${msg.sessionId} (T8 will implement)`
        );
        client.send({
          type: "session_error",
          deviceId: config.deviceId,
          sessionId: msg.sessionId,
          error:
            "Session lifecycle management not yet implemented (coming in T8)",
        });
        break;
      }

      case "stop_session": {
        logger.info(`[Tunnel] stop_session for ${msg.sessionId}`);
        tunnelHandler.unregisterPort(msg.sessionId);
        break;
      }

      case "tunnel_request": {
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
