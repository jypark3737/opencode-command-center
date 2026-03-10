export type TaskStatus =
  | "PENDING"
  | "ASSIGNED"
  | "RUNNING"
  | "DONE"
  | "FAILED"
  | "CANCELLED";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  assignedDeviceId: string | null;
  opencodeSessionId: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
}

export interface SubTodo {
  id: string;
  taskId: string;
  content: string;
  checked: boolean;
  position: number;
  updatedAt: Date;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  position?: number;
}

export interface SubTodoUpdate {
  content: string;
  checked: boolean;
  position: number;
}
