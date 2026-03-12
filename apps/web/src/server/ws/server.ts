import { WebSocketServer, WebSocket } from "ws";

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

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log("[WS] Message received:", msg.type);
      } catch (err) {
        console.error("[WS] Error parsing message:", err);
      }
    });

    ws.on("close", () => {
      console.log("[WS] Connection closed");
    });

    ws.on("error", (err) => {
      console.error("[WS] WebSocket error:", err);
    });
  });
}
