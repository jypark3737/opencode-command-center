export interface Project {
  id: string;
  name: string;
  path: string;
  description: string | null;
  deviceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  path: string;
  description?: string;
  deviceId: string;
}
