import type { WebSocket } from "ws";
import type {
  HeartbeatMessage,
  HeartbeatAckMessage,
} from "@opencode-cc/shared";
import { db } from "../../db";

export async function handleHeartbeat(
  ws: WebSocket,
  msg: HeartbeatMessage
): Promise<void> {
  // Update DB
  await db.device
    .update({
      where: { id: msg.deviceId },
      data: {
        status: "ONLINE",
        lastHeartbeat: new Date(msg.timestamp),
      },
    })
    .catch(() => {
      // Device may not exist yet if registration is in flight
    });

  // Send ack
  const ack: HeartbeatAckMessage = {
    type: "heartbeat_ack",
    timestamp: Date.now(),
  };
  ws.send(JSON.stringify(ack));
}
