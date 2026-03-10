export interface RegisterAckMessage {
  type: "register_ack";
  deviceId: string;
  success: boolean;
  error?: string;
}

export interface AssignTaskMessage {
  type: "assign_task";
  taskId: string;
  projectPath: string;
  title: string;
  description: string;
}

export interface CancelTaskMessage {
  type: "cancel_task";
  taskId: string;
}

export interface HeartbeatAckMessage {
  type: "heartbeat_ack";
  timestamp: number;
}

export type ServerMessage =
  | RegisterAckMessage
  | AssignTaskMessage
  | CancelTaskMessage
  | HeartbeatAckMessage;
