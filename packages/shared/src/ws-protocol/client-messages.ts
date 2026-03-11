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

export interface SessionsDiscoveredMessage {
  type: "sessions_discovered";
  deviceId: string;
  sessions: Array<{
    opencodeSessionId: string;
    projectPath: string;
    title?: string;
    port?: number;
  }>;
}

export interface SessionStatusMessage {
  type: "session_status";
  deviceId: string;
  sessionId: string;
  status: "IDLE" | "BUSY" | "DEAD";
}

export interface TaskVerificationMessage {
  type: "task_verification";
  taskId: string;
  deviceId: string;
  verification: {
    passed: boolean;
    type: string;
    buildOutput?: string;
    llmVerdict?: string;
    llmNotes?: string;
  };
}

export interface AdminRunResultMessage {
  type: "admin_run_result";
  requestId: string;
  deviceId: string;
  output: string;
  exitCode: number;
  error?: string;
}

export type ClientMessage =
  | RegisterMessage
  | HeartbeatMessage
  | TaskStartedMessage
  | SubTodosUpdatedMessage
  | TaskCompletedMessage
  | TaskFailedMessage
  | SessionsDiscoveredMessage
  | SessionStatusMessage
  | TaskVerificationMessage
  | AdminRunResultMessage;
