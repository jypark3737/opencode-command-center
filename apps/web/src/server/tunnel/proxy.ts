import type { IncomingMessage, ServerResponse } from "http";
import { agentRegistry } from "../ws/registry";
import { rewriteHtml } from "./rewriter";
import type {
  TunnelResponseStartMessage,
  TunnelResponseChunkMessage,
  TunnelResponseEndMessage,
  TunnelResponseErrorMessage,
} from "@opencode-cc/shared";
import { randomUUID } from "crypto";

interface PendingRequest {
  res: ServerResponse;
  deviceId: string;
  sessionId: string;
  prefix: string;
  isSSE: boolean;
  timeout: ReturnType<typeof setTimeout> | null;
  responseStarted: boolean;
  buffer: Buffer[];
  contentType: string;
}

const globalForTunnel = globalThis as unknown as {
  __pendingTunnelRequests?: Map<string, PendingRequest>;
};
globalForTunnel.__pendingTunnelRequests ??= new Map();
export const pendingRequests = globalForTunnel.__pendingTunnelRequests;

export async function handleTunnelRequest(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
): Promise<void> {
  // /t/{deviceId}/{sessionId}/rest/of/path → ["", "t", deviceId, sessionId, ...rest]
  const parts = pathname.split("/");
  if (parts.length < 4) {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end(errorPage(400, "Bad Request", "Invalid tunnel URL path."));
    return;
  }
  const deviceId = parts[2]!;
  const sessionId = parts[3]!;
  const innerPath = "/" + parts.slice(4).join("/") || "/";

  const device = agentRegistry.get(deviceId);
  if (!device) {
    res.writeHead(502, { "Content-Type": "text/html" });
    res.end(errorPage(502, "Device Not Connected", `Device ${deviceId} is not currently connected to the hub.`));
    return;
  }

  const requestId = randomUUID();
  const prefix = `/t/${deviceId}/${sessionId}`;

  const acceptHeader = req.headers["accept"] ?? "";
  const isSSE = acceptHeader.includes("text/event-stream");

  let bodyBuffer: Buffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of req as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length > 0) {
      bodyBuffer = Buffer.concat(chunks);
    }
  }

  const tunnelMsg = {
    type: "tunnel_request" as const,
    id: requestId,
    sessionId,
    method: req.method ?? "GET",
    path:
      innerPath +
      (req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""),
    headers: headersToRecord(req.headers),
    body: bodyBuffer ? bodyBuffer.toString("base64") : undefined,
  };

  const pending: PendingRequest = {
    res,
    deviceId,
    sessionId,
    prefix,
    isSSE,
    timeout: null,
    responseStarted: false,
    buffer: [],
    contentType: "",
  };

  // SSE connections stay open indefinitely — only timeout regular requests
  if (!isSSE) {
    pending.timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      if (!pending.responseStarted) {
        res.writeHead(504, { "Content-Type": "text/html" });
        res.end(errorPage(504, "Gateway Timeout", "The device did not respond within 30 seconds."));
      } else {
        res.end();
      }
    }, 30_000);
  }

  pendingRequests.set(requestId, pending);

  device.ws.send(JSON.stringify(tunnelMsg));

  req.on("close", () => {
    if (pendingRequests.has(requestId)) {
      pendingRequests.delete(requestId);
      if (pending.timeout) clearTimeout(pending.timeout);
    }
  });
}

export function resolvePendingRequest(
  msg:
    | TunnelResponseStartMessage
    | TunnelResponseChunkMessage
    | TunnelResponseEndMessage
    | TunnelResponseErrorMessage
): void {
  const pending = pendingRequests.get(msg.id);
  if (!pending) return;

  if (msg.type === "tunnel_response_error") {
    pendingRequests.delete(msg.id);
    if (pending.timeout) clearTimeout(pending.timeout);
    if (!pending.responseStarted) {
      pending.res.writeHead(502, { "Content-Type": "text/html" });
      pending.res.end(errorPage(502, "Tunnel Error", msg.error));
    } else {
      pending.res.end();
    }
    return;
  }

  if (msg.type === "tunnel_response_start") {
    pending.responseStarted = true;
    const ct = msg.headers["content-type"] ?? "";
    pending.contentType = ct;

    // Strip headers that interfere with tunnel embedding/rewriting
    const cleanHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(msg.headers)) {
      const lower = k.toLowerCase();
      if (lower === "x-frame-options") continue;
      if (lower === "content-security-policy") continue;
      if (lower === "content-length") continue;
      cleanHeaders[k] = v;
    }

    pending.res.writeHead(msg.status, cleanHeaders);

    if (pending.isSSE) {
      (
        pending.res as ServerResponse & { flushHeaders?: () => void }
      ).flushHeaders?.();
    }
    return;
  }

  if (msg.type === "tunnel_response_chunk") {
    const chunk = Buffer.from(msg.data, "base64");
    const isHtml = pending.contentType.includes("text/html");

    if (isHtml) {
      // Buffer HTML chunks for path rewriting at end
      pending.buffer.push(chunk);
    } else {
      pending.res.write(chunk);
    }
    return;
  }

  if (msg.type === "tunnel_response_end") {
    pendingRequests.delete(msg.id);
    if (pending.timeout) clearTimeout(pending.timeout);

    const isHtml = pending.contentType.includes("text/html");
    if (isHtml && pending.buffer.length > 0) {
      const fullHtml = Buffer.concat(pending.buffer).toString("utf-8");
      const rewritten = rewriteHtml(fullHtml, pending.prefix);
      pending.res.write(rewritten);
    }

    pending.res.end();
    return;
  }
}

function errorPage(status: number, title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title>
<style>
  body { margin: 0; background: #030712; color: #9ca3af; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; }
  .box { text-align: center; }
  .code { font-size: 48px; font-weight: bold; color: #374151; margin-bottom: 8px; }
  .msg { font-size: 14px; color: #6b7280; }
</style>
</head>
<body><div class="box"><div class="code">${status}</div><div class="msg">${message}</div></div></body>
</html>`;
}

function headersToRecord(
  headers: IncomingMessage["headers"]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v)) out[k] = v.join(", ");
  }
  return out;
}
