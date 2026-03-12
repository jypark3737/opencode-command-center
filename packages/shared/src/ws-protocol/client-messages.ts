export interface RegisterMessage {
  type: "register";
  deviceId: string;
  deviceName: string;
  hostname: string;
  apiKey: string;
  projects: Array<{
    path: string;
    name: string;
  }>;
}

export interface HeartbeatMessage {
  type: "heartbeat";
  deviceId: string;
  timestamp: number;
  opencodeRunning: boolean;
  activeTaskId: string | null;
}

// Daemon → Hub: streamed tunnel response
export interface TunnelResponseStartMessage {
  type: "tunnel_response_start";
  id: string;
  deviceId: string;
  status: number;
  headers: Record<string, string>;
}

export interface TunnelResponseChunkMessage {
  type: "tunnel_response_chunk";
  id: string;
  data: string; // base64-encoded chunk
}

export interface TunnelResponseEndMessage {
  type: "tunnel_response_end";
  id: string;
}

export interface TunnelResponseErrorMessage {
  type: "tunnel_response_error";
  id: string;
  deviceId: string;
  error: string;
}

// Daemon → Hub: session info
export interface SessionsListMessage {
  type: "sessions_list";
  deviceId: string;
  sessions: Array<{
    id: string;
    directory: string;
    title?: string;
    timeCreated: string;
    webPort?: number;
  }>;
}

export interface SessionStartedMessage {
  type: "session_started";
  deviceId: string;
  sessionId: string;
  webPort: number;
}

export interface SessionErrorMessage {
  type: "session_error";
  deviceId: string;
  sessionId: string;
  error: string;
}

export type ClientMessage =
  | RegisterMessage
  | HeartbeatMessage
  | TunnelResponseStartMessage
  | TunnelResponseChunkMessage
  | TunnelResponseEndMessage
  | TunnelResponseErrorMessage
  | SessionsListMessage
  | SessionStartedMessage
  | SessionErrorMessage;
