import { WebSocketServer, WebSocket } from "ws";
import type { ClientMessage } from "@opencode-cc/shared";
import { agentRegistry } from "./registry";
import { handleRegister } from "./handlers/register";
import { handleHeartbeat } from "./handlers/heartbeat";
import {
  handleTaskStarted,
  handleSubTodosUpdated,
} from "./handlers/status-update";
import {
  handleTaskCompleted,
  handleTaskFailed,
} from "./handlers/task-result";
import {
  handleSessionsDiscovered,
  handleSessionStatus,
  handleTaskVerification,
} from "./handlers/session";
import { handleAdminRunResult } from "./handlers/admin";
import { db } from "../db";
import { sseBroadcaster } from "./sse";

let wss: WebSocketServer | null = null;

export function getWebSocketServer(): WebSocketServer {
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });
    setupWebSocketServer(wss);
  }
  return wss;
}

function setupWebSocketServer(server: WebSocketServer): void {
  server.on("connection", (ws: WebSocket) => {
    console.log("[WS] New connection");
    let deviceId: string | null = null;

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ClientMessage;

        if (msg.type === "register") {
          deviceId = msg.deviceId;
          await handleRegister(ws, msg);
        } else if (msg.type === "heartbeat") {
          await handleHeartbeat(ws, msg);
        } else if (msg.type === "task_started") {
          await handleTaskStarted(msg);
        } else if (msg.type === "subtodos_updated") {
          await handleSubTodosUpdated(msg);
        } else if (msg.type === "task_completed") {
          await handleTaskCompleted(msg);
        } else if (msg.type === "task_failed") {
          await handleTaskFailed(msg);
        } else if (msg.type === "sessions_discovered") {
          await handleSessionsDiscovered(msg);
        } else if (msg.type === "session_status") {
          await handleSessionStatus(msg);
        } else if (msg.type === "task_verification") {
          await handleTaskVerification(msg);
        } else if (msg.type === "admin_run_result") {
          await handleAdminRunResult(msg);
        }
      } catch (err) {
        console.error("[WS] Error handling message:", err);
      }
    });

    ws.on("close", async () => {
      if (deviceId) {
        agentRegistry.unregister(deviceId);
        await db.device
          .update({
            where: { id: deviceId },
            data: { status: "OFFLINE" },
          })
          .catch(() => {});

        // Mark all sessions for this device as DEAD
        await db.session
          .updateMany({
            where: {
              deviceId,
              status: { in: ["IDLE", "BUSY", "DISCOVERED"] },
            },
            data: { status: "DEAD" },
          })
          .catch(() => {});

        sseBroadcaster.broadcast({
          type: "device_status_changed",
          deviceId,
          status: "OFFLINE",
          lastHeartbeat: new Date().toISOString(),
        });
        console.log(`[WS] Agent disconnected: ${deviceId}`);
      }
    });

    ws.on("error", (err) => {
      console.error("[WS] WebSocket error:", err);
    });
  });

  // Stale agent detection — run every 2 minutes
  setInterval(async () => {
    const staleThreshold = new Date(Date.now() - 2 * 60 * 1000);
    await db.device.updateMany({
      where: {
        status: "ONLINE",
        lastHeartbeat: { lt: staleThreshold },
      },
      data: { status: "STALE" },
    });
  }, 2 * 60 * 1000);
}
