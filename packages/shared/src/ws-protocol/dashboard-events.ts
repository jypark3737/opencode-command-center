import type { DeviceStatus, TaskStatus, SubTodoUpdate } from "../types/index";

export type DashboardEvent =
  | {
      type: "device_status_changed";
      deviceId: string;
      status: DeviceStatus;
      lastHeartbeat: string;
    }
  | {
      type: "task_status_changed";
      taskId: string;
      status: TaskStatus;
      projectId: string;
    }
  | {
      type: "subtodos_updated";
      taskId: string;
      subTodos: SubTodoUpdate[];
    }
  | {
      type: "task_completed";
      taskId: string;
      projectId: string;
    }
  | {
      type: "task_failed";
      taskId: string;
      projectId: string;
      error: string;
    }
  | {
      type: "session_discovered";
      deviceId: string;
      sessionId: string;
      projectPath: string;
    }
  | {
      type: "session_status_changed";
      sessionId: string;
      deviceId: string;
      status: string;
    }
  | {
      type: "task_verification_result";
      taskId: string;
      projectId: string;
      passed: boolean;
    }
  | {
      type: "admin_todo_status_changed";
      todoId: string;
      oldStatus: string;
      newStatus: string;
      convertedInstruction?: string;
      assignedSessionId?: string;
    }
  | {
      type: "admin_orchestrator_status";
      isProcessing: boolean;
      currentAction: string;
      queueLength: number;
      lastError?: string;
    }
  | {
      type: "admin_verification_result";
      todoId: string;
      passed: boolean;
      feedback?: string;
      retryCount: number;
    }
  | {
      type: "admin_todo_escalated";
      todoId: string;
      content: string;
      verificationNotes?: string;
      retryCount: number;
    };
