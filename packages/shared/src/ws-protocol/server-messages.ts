export interface RegisterAckMessage {
  type: "register_ack";
  deviceId: string;
  success: boolean;
  error?: string;
}

export interface HeartbeatAckMessage {
  type: "heartbeat_ack";
  timestamp: number;
}

export interface TunnelRequestMessage {
  type: "tunnel_request";
  id: string;
  sessionId: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: string;
}

export interface ListSessionsMessage {
  type: "list_sessions";
}

export interface StartSessionMessage {
  type: "start_session";
  sessionId: string;
}

export interface StopSessionMessage {
  type: "stop_session";
  sessionId: string;
}

export type ServerMessage =
  | RegisterAckMessage
  | HeartbeatAckMessage
  | TunnelRequestMessage
  | ListSessionsMessage
  | StartSessionMessage
  | StopSessionMessage;
