import { agentRegistry } from "@/server/ws/registry";
import { deviceSessions } from "@/server/ws/device-sessions";

export async function GET() {
  const devices = agentRegistry.getAll().map((conn) => ({
    deviceId: conn.deviceId,
    deviceName: conn.deviceName,
    hostname: conn.hostname,
    sessions: deviceSessions.getSessions(conn.deviceId),
  }));
  return Response.json({ devices });
}
