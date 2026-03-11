export interface RegisterAckMessage {
  type: "register_ack";
  deviceId: string;
  success: boolean;
  error?: string;
}

export interface AssignTaskMessage {
  type: "assign_task";
  taskId: string;
  sessionId: string;
  projectPath: string;
  title: string;
  description: string;
  verification: {
    type: string;
    command?: string;
  };
}

export interface CancelTaskMessage {
  type: "cancel_task";
  taskId: string;
}

export interface HeartbeatAckMessage {
  type: "heartbeat_ack";
  timestamp: number;
}

export interface CreateSessionMessage {
  type: "create_session";
  sessionId: string;
  projectPath: string;
}

export interface DiscoverSessionsMessage {
  type: "discover_sessions";
}

export interface AdminRunCommandMessage {
  type: "admin_run_command";
  requestId: string;
  command: string;
  projectPath?: string;
  sessionId?: string;
}

export type ServerMessage =
  | RegisterAckMessage
  | AssignTaskMessage
  | CancelTaskMessage
  | HeartbeatAckMessage
  | CreateSessionMessage
  | DiscoverSessionsMessage
  | AdminRunCommandMessage;
