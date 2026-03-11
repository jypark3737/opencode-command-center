export type AdminTodoStatus =
  | "PENDING"
  | "CONVERTING"
  | "READY"
  | "ASSIGNED"
  | "VERIFYING"
  | "DONE"
  | "FAILED"
  | "CANCELLED";

export interface AdminTodo {
  id: string;
  content: string;
  status: AdminTodoStatus;
  createdAt: Date;
  updatedAt: Date;
  convertedInstruction?: string;
  assignedSessionId?: string;
  assignedDeviceId?: string;
  retryCount: number;
  maxRetries: number;
  verificationNotes?: string;
  completedAt?: Date;
}

export interface AdminOrchestratorStatus {
  isProcessing: boolean;
  currentAction: string;
  queueLength: number;
  lastError?: string;
}

export interface AdminVerificationResult {
  todoId: string;
  passed: boolean;
  feedback?: string;
  retryCount: number;
  maxRetries: number;
}
