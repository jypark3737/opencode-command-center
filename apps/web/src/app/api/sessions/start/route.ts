import { agentRegistry } from "@/server/ws/registry";

export async function POST(req: Request) {
  const { deviceId, sessionId } = await req.json() as { deviceId: string; sessionId: string };
  const device = agentRegistry.get(deviceId);
  if (!device) return Response.json({ error: "Device not connected" }, { status: 404 });
  device.ws.send(JSON.stringify({ type: "start_session", sessionId }));
  return Response.json({ status: "starting" });
}
