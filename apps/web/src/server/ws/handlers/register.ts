import type { WebSocket } from "ws";
import type {
  RegisterMessage,
  RegisterAckMessage,
  DiscoverSessionsMessage,
} from "@opencode-cc/shared";
import { agentRegistry } from "../registry";
import { db } from "../../db";
import { validateApiKey } from "../../auth";
import { sseBroadcaster } from "../sse";

export async function handleRegister(
  ws: WebSocket,
  msg: RegisterMessage
): Promise<void> {
  // Validate API key
  if (!validateApiKey(msg.apiKey)) {
    const ack: RegisterAckMessage = {
      type: "register_ack",
      deviceId: msg.deviceId,
      success: false,
      error: "Invalid API key",
    };
    ws.send(JSON.stringify(ack));
    ws.close();
    return;
  }

  // Upsert device in DB
  await db.device.upsert({
    where: { id: msg.deviceId },
    update: {
      name: msg.deviceName,
      hostname: msg.hostname,
      status: "ONLINE",
      lastHeartbeat: new Date(),
    },
    create: {
      id: msg.deviceId,
      name: msg.deviceName,
      hostname: msg.hostname,
      status: "ONLINE",
      lastHeartbeat: new Date(),
    },
  });

  // Register in memory
  agentRegistry.register({
    deviceId: msg.deviceId,
    deviceName: msg.deviceName,
    hostname: msg.hostname,
    ws,
    connectedAt: new Date(),
    projects: msg.projects,
  });

  // Send ack
  const ack: RegisterAckMessage = {
    type: "register_ack",
    deviceId: msg.deviceId,
    success: true,
  };
  ws.send(JSON.stringify(ack));

  // Notify dashboard
  sseBroadcaster.broadcast({
    type: "device_status_changed",
    deviceId: msg.deviceId,
    status: "ONLINE",
    lastHeartbeat: new Date().toISOString(),
  });

  console.log(`[WS] Agent registered: ${msg.deviceName} (${msg.deviceId})`);

  // Ask daemon to discover its opencode sessions
  const discoverMsg: DiscoverSessionsMessage = {
    type: "discover_sessions",
  };
  ws.send(JSON.stringify(discoverMsg));
}
