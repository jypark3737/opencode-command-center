import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { ClientMessage, RegisterMessage } from "@opencode-cc/shared";
import { agentRegistry } from "./registry";
import { deviceSessions } from "./device-sessions";
import { validateApiKey } from "../auth";
import { resolvePendingRequest } from "../tunnel/proxy";

let wss: WebSocketServer | null = null;

export function getWebSocketServer(): WebSocketServer {
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });
    setupWebSocketServer(wss);
  }
  return wss;
}

function setupWebSocketServer(server: WebSocketServer): void {
  server.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    console.log("[WS] New connection from", req.socket.remoteAddress);
    let deviceId: string | null = null;

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ClientMessage;

        switch (msg.type) {
          case "register": {
            handleRegister(ws, msg);
            deviceId = msg.deviceId;
            break;
          }

          case "heartbeat": {
            ws.send(JSON.stringify({ type: "heartbeat_ack", timestamp: Date.now() }));
            break;
          }

          case "sessions_list": {
            deviceSessions.setSessions(
              msg.deviceId,
              msg.sessions.map((s) => ({
                id: s.id,
                directory: s.directory,
                title: s.title,
                timeCreated: s.timeCreated,
                webPort: s.webPort,
              }))
            );
            console.log(`[WS] Sessions updated for ${msg.deviceId}: ${msg.sessions.length} sessions`);
            break;
          }

          case "session_started": {
            deviceSessions.updateSessionPort(msg.deviceId, msg.sessionId, msg.webPort);
            console.log(`[WS] Session ${msg.sessionId} started on port ${msg.webPort}`);
            break;
          }

          case "session_error": {
            console.error(`[WS] Session error for ${msg.sessionId} on ${msg.deviceId}: ${msg.error}`);
            break;
          }

          case "tunnel_response_start":
          case "tunnel_response_chunk":
          case "tunnel_response_end":
          case "tunnel_response_error": {
            resolvePendingRequest(msg);
            break;
          }

          default: {
            const _exhaustive: never = msg;
            console.log("[WS] Unhandled message type:", (_exhaustive as ClientMessage).type);
          }
        }
      } catch (err) {
        console.error("[WS] Error handling message:", err);
      }
    });

    ws.on("close", () => {
      if (deviceId) {
        agentRegistry.unregister(deviceId);
        deviceSessions.removeDevice(deviceId);
        console.log(`[WS] Device disconnected: ${deviceId}`);
      }
    });

    ws.on("error", (err) => {
      console.error("[WS] WebSocket error:", err);
    });
  });
}

function handleRegister(ws: WebSocket, msg: RegisterMessage): void {
  if (!validateApiKey(msg.apiKey)) {
    console.warn(`[WS] Invalid API key from device ${msg.deviceId}`);
    ws.send(
      JSON.stringify({
        type: "register_ack",
        deviceId: msg.deviceId,
        success: false,
        error: "Invalid API key",
      })
    );
    ws.close();
    return;
  }

  agentRegistry.register({
    deviceId: msg.deviceId,
    deviceName: msg.deviceName,
    hostname: msg.hostname,
    ws,
    connectedAt: new Date(),
    projects: msg.projects,
  });

  console.log(`[WS] Device registered: ${msg.deviceName} (${msg.deviceId})`);

  ws.send(
    JSON.stringify({
      type: "register_ack",
      deviceId: msg.deviceId,
      success: true,
    })
  );

  ws.send(JSON.stringify({ type: "list_sessions" }));
}
