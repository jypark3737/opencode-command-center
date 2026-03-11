import type { WebSocket } from "ws";

export interface AgentConnection {
  deviceId: string;
  deviceName: string;
  hostname: string;
  ws: WebSocket;
  connectedAt: Date;
  projects: Array<{ path: string; name: string }>;
}

class AgentRegistry {
  private connections = new Map<string, AgentConnection>();

  register(conn: AgentConnection): void {
    this.connections.set(conn.deviceId, conn);
  }

  unregister(deviceId: string): void {
    this.connections.delete(deviceId);
  }

  get(deviceId: string): AgentConnection | undefined {
    return this.connections.get(deviceId);
  }

  getAll(): AgentConnection[] {
    return Array.from(this.connections.values());
  }

  getByProjectPath(projectPath: string): AgentConnection | undefined {
    return this.getAll().find((conn) =>
      conn.projects.some((p) => p.path === projectPath)
    );
  }

  isConnected(deviceId: string): boolean {
    return this.connections.has(deviceId);
  }

  size(): number {
    return this.connections.size;
  }
}

const globalForRegistry = globalThis as unknown as { __agentRegistry?: AgentRegistry };
globalForRegistry.__agentRegistry ??= new AgentRegistry();
export const agentRegistry = globalForRegistry.__agentRegistry;
