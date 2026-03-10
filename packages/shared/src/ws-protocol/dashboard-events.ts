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
    };
