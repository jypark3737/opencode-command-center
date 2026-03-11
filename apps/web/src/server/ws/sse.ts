import type { DashboardEvent } from "@opencode-cc/shared";

class SSEBroadcaster {
  private clients = new Set<ReadableStreamDefaultController>();

  addClient(controller: ReadableStreamDefaultController): void {
    this.clients.add(controller);
  }

  removeClient(controller: ReadableStreamDefaultController): void {
    this.clients.delete(controller);
  }

  broadcast(event: DashboardEvent): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    const encoder = new TextEncoder();
    const chunk = encoder.encode(data);
    for (const controller of this.clients) {
      try {
        controller.enqueue(chunk);
      } catch {
        // Client disconnected
        this.clients.delete(controller);
      }
    }
  }

  clientCount(): number {
    return this.clients.size;
  }
}

const globalForSSE = globalThis as unknown as { __sseBroadcaster?: SSEBroadcaster };
globalForSSE.__sseBroadcaster ??= new SSEBroadcaster();
export const sseBroadcaster = globalForSSE.__sseBroadcaster;
