export interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
}

export interface AdminReview {
  verdict: string;
  notes: string;
  reviewedAt: string;
}

export interface TaskResult {
  id: string;
  taskId: string;
  summary: string;
  filesChanged: FileChange[];
  tokensUsed: number;
  durationMs: number;
  fullTranscript: unknown;
  adminReview: AdminReview | null;
  createdAt: Date;
}
