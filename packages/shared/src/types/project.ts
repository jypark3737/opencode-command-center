import type { VerificationType } from "./session";

export interface Project {
  id: string;
  name: string;
  path: string;
  description: string | null;
  deviceId: string;
  verificationType: VerificationType;
  verifyCommand: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  path: string;
  description?: string;
  deviceId: string;
  verificationType?: VerificationType;
  verifyCommand?: string;
}
