import { logger } from "./logger";
import type { CommandCenterClient } from "./ws-client";
import type { TunnelRequestMessage } from "@opencode-cc/shared";

const MAX_CHUNK_SIZE = 256 * 1024;
const FETCH_TIMEOUT_MS = 30000;
const MAX_RESPONSE_BYTES = 50 * 1024 * 1024;

export class TunnelHandler {
  private portMap = new Map<string, number>();

  registerPort(sessionId: string, port: number): void {
    this.portMap.set(sessionId, port);
  }

  unregisterPort(sessionId: string): void {
    this.portMap.delete(sessionId);
  }

  getPort(sessionId: string): number | undefined {
    return this.portMap.get(sessionId);
  }

  async handleRequest(
    msg: TunnelRequestMessage,
    client: CommandCenterClient,
    deviceId: string
  ): Promise<void> {
    const port = this.portMap.get(msg.sessionId);

    if (!port) {
      client.send({
        type: "tunnel_response_error",
        id: msg.id,
        deviceId,
        error: `Session ${msg.sessionId} not running. Send start_session first.`,
      });
      return;
    }

    const url = `http://127.0.0.1:${port}${msg.path}`;
    const isSSE = (msg.headers["accept"] ?? "").includes("text/event-stream");

    const fetchHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(msg.headers)) {
      const lower = k.toLowerCase();
      if (lower === "host") {
        fetchHeaders["host"] = `127.0.0.1:${port}`;
        continue;
      }
      // Skip hop-by-hop headers
      if (lower === "connection" || lower === "transfer-encoding") continue;
      fetchHeaders[k] = v;
    }

    const fetchInit: RequestInit = {
      method: msg.method,
      headers: fetchHeaders,
      body: msg.body ? Buffer.from(msg.body, "base64") : undefined,
    };

    // Add timeout for non-SSE requests (SSE streams can be long-lived)
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (!isSSE) {
      const abortController = new AbortController();
      timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);
      fetchInit.signal = abortController.signal;
    }

    try {
      const response = await fetch(url, fetchInit);
      if (timeoutId !== undefined) clearTimeout(timeoutId);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      client.send({
        type: "tunnel_response_start",
        id: msg.id,
        deviceId,
        status: response.status,
        headers: responseHeaders,
      });

      if (response.body) {
        const reader = response.body.getReader();
        let totalBytes = 0;
        let oversized = false;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            totalBytes += value.length;
            if (totalBytes > MAX_RESPONSE_BYTES) {
              oversized = true;
              break;
            }

            let offset = 0;
            while (offset < value.length) {
              const chunk = value.slice(offset, offset + MAX_CHUNK_SIZE);
              client.send({
                type: "tunnel_response_chunk",
                id: msg.id,
                data: Buffer.from(chunk).toString("base64"),
              });
              offset += MAX_CHUNK_SIZE;
            }
          }
        } finally {
          reader.releaseLock();
        }
        if (oversized) {
          client.send({
            type: "tunnel_response_error",
            id: msg.id,
            deviceId,
            error: "Response too large (exceeds 50MB limit)",
          });
          return;
        }
      }

      client.send({
        type: "tunnel_response_end",
        id: msg.id,
      });
    } catch (err: unknown) {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      const error = err instanceof Error ? err.message : String(err);
      const isTimeout =
        error.includes("abort") || error.includes("AbortError");
      logger.error(
        `[Tunnel] Request failed for session ${msg.sessionId}: ${error}`
      );
      client.send({
        type: "tunnel_response_error",
        id: msg.id,
        deviceId,
        error: isTimeout ? "Upstream timeout" : `Fetch failed: ${error}`,
      });
    }
  }
}
