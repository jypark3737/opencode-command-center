export interface DeviceSession {
  id: string;
  directory: string;
  title?: string;
  timeCreated: string;
  webPort?: number; // set when opencode web is running for this session
}

class DeviceSessionStore {
  private sessions = new Map<string, DeviceSession[]>(); // deviceId → sessions

  setSessions(deviceId: string, sessions: DeviceSession[]): void {
    this.sessions.set(deviceId, sessions);
  }

  getSessions(deviceId: string): DeviceSession[] {
    return this.sessions.get(deviceId) ?? [];
  }

  getAllDevicesWithSessions(): Array<{ deviceId: string; sessions: DeviceSession[] }> {
    return Array.from(this.sessions.entries()).map(([deviceId, sessions]) => ({
      deviceId,
      sessions,
    }));
  }

  updateSessionPort(deviceId: string, sessionId: string, port: number): void {
    const deviceSessions = this.sessions.get(deviceId);
    if (!deviceSessions) return;
    const session = deviceSessions.find((s) => s.id === sessionId);
    if (session) {
      session.webPort = port;
    }
  }

  removeDevice(deviceId: string): void {
    this.sessions.delete(deviceId);
  }

  hasDevice(deviceId: string): boolean {
    return this.sessions.has(deviceId);
  }
}

const g = globalThis as unknown as { __deviceSessions?: DeviceSessionStore };
g.__deviceSessions ??= new DeviceSessionStore();
export const deviceSessions = g.__deviceSessions;
