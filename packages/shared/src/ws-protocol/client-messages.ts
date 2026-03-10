import type { SubTodoUpdate, FileChange } from "../types/index";

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

export interface TaskStartedMessage {
  type: "task_started";
  taskId: string;
  deviceId: string;
  opencodeSessionId: string;
  timestamp: number;
}

export interface SubTodosUpdatedMessage {
  type: "subtodos_updated";
  taskId: string;
  deviceId: string;
  subTodos: SubTodoUpdate[];
}

export interface TaskCompletedMessage {
  type: "task_completed";
  taskId: string;
  deviceId: string;
  opencodeSessionId: string;
  result: {
    summary: string;
    filesChanged: FileChange[];
    tokensUsed: number;
    durationMs: number;
    fullTranscript: unknown;
  };
  timestamp: number;
}

export interface TaskFailedMessage {
  type: "task_failed";
  taskId: string;
  deviceId: string;
  error: string;
  timestamp: number;
}

export type ClientMessage =
  | RegisterMessage
  | HeartbeatMessage
  | TaskStartedMessage
  | SubTodosUpdatedMessage
  | TaskCompletedMessage
  | TaskFailedMessage;
