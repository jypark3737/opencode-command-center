export type SessionStatus = "DISCOVERED" | "IDLE" | "BUSY" | "DEAD";
export type VerificationType = "NONE" | "BUILD" | "LLM" | "BUILD_AND_LLM";

export interface Session {
  id: string;
  deviceId: string;
  projectPath: string;
  opencodeSessionId: string | null;
  opencodePort: number | null;
  status: SessionStatus;
  createdAt: Date;
  lastActiveAt: Date;
  updatedAt: Date;
}

export interface CreateSessionInput {
  deviceId: string;
  projectPath: string;
  opencodePort?: number;
}

export interface VerificationResult {
  passed: boolean;
  type: VerificationType;
  buildOutput?: string;
  llmVerdict?: string;
  llmNotes?: string;
}
