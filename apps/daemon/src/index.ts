import { loadConfig } from "./config";
import { logger } from "./logger";
import { CommandCenterClient } from "./ws-client";
import { HeartbeatSender } from "./heartbeat";
import { OpenCodeProcess } from "./opencode/process";
import { OpenCodeSQLiteReader } from "./opencode/sqlite-reader";
import { TaskRunner } from "./task-runner";
import type { ServerMessage, FileChange } from "@opencode-cc/shared";

async function main() {
  logger.info("OpenCode Command Center — Agent Daemon v0.1.0");

  const config = loadConfig();
  logger.info(`Device: ${config.deviceName} (${config.deviceId})`);
  logger.info(
    `Projects: ${config.projects.map((p) => p.name).join(", ") || "none"}`
  );

  // Initialize opencode process
  const opencodeProcess = new OpenCodeProcess(config.opencodeBin);
  await opencodeProcess.start();

  // Initialize SQLite reader for subtodo polling
  const sqliteReader = new OpenCodeSQLiteReader();
  sqliteReader.connect();

  // Initialize WS client
  const client = new CommandCenterClient(config);

  // Initialize heartbeat
  const heartbeat = new HeartbeatSender(client, config);

  // Initialize task runner
  const taskRunner = new TaskRunner({
    opencode: opencodeProcess,
    sqliteReader,
    opencodeBin: config.opencodeBin,
    onTaskStarted: (taskId, sessionId) => {
      heartbeat.setActiveTask(taskId);
      client.send({
        type: "task_started",
        taskId,
        deviceId: config.deviceId,
        opencodeSessionId: sessionId,
        timestamp: Date.now(),
      });
    },
    onSubTodosUpdated: (taskId, subTodos) => {
      client.send({
        type: "subtodos_updated",
        taskId,
        deviceId: config.deviceId,
        subTodos,
      });
    },
    onTaskCompleted: (taskId, sessionId, result) => {
      heartbeat.setActiveTask(null);
      client.send({
        type: "task_completed",
        taskId,
        deviceId: config.deviceId,
        opencodeSessionId: sessionId,
        result: {
          summary: result.summary,
          filesChanged: result.filesChanged as FileChange[],
          tokensUsed: result.tokensUsed,
          durationMs: result.durationMs,
          fullTranscript: result.fullTranscript,
        },
        timestamp: Date.now(),
      });
    },
    onTaskFailed: (taskId, error) => {
      heartbeat.setActiveTask(null);
      client.send({
        type: "task_failed",
        taskId,
        deviceId: config.deviceId,
        error,
        timestamp: Date.now(),
      });
    },
  });

  // Handle messages from Command Center
  client.onMessage(async (msg: ServerMessage) => {
    if (msg.type === "register_ack") {
      if (msg.success) {
        logger.info("Registration successful");
        heartbeat.start();
      } else {
        logger.error(`Registration failed: ${msg.error}`);
        process.exit(1);
      }
    } else if (msg.type === "assign_task") {
      logger.info(`Received task assignment: ${msg.title}`);
      // Run task asynchronously (don't await — let it run in background)
      taskRunner.runTask(msg).catch((err) => {
        logger.error("Unhandled task runner error", err);
      });
    } else if (msg.type === "cancel_task") {
      logger.info(`Task cancellation requested: ${msg.taskId}`);
      // TODO: implement cancellation in future
    } else if (msg.type === "heartbeat_ack") {
      // Heartbeat acknowledged — all good
    }
  });

  // Connect to Command Center
  await client.connect();

  // Graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("Shutting down...");
    heartbeat.stop();
    client.disconnect();
    sqliteReader.close();
    await opencodeProcess.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("Shutting down (SIGTERM)...");
    heartbeat.stop();
    client.disconnect();
    sqliteReader.close();
    await opencodeProcess.stop();
    process.exit(0);
  });

  logger.info("Daemon running. Press Ctrl+C to stop.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
