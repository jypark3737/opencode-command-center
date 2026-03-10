import { logger } from "./logger";

export interface ProjectConfig {
  path: string;
  name: string;
}

export interface DaemonConfig {
  commandCenterUrl: string;
  apiKey: string;
  deviceId: string;
  deviceName: string;
  hostname: string;
  projects: ProjectConfig[];
  opencodeBin: string;
}

export function loadConfig(): DaemonConfig {
  const required = {
    COMMAND_CENTER_URL: process.env.COMMAND_CENTER_URL,
    COMMAND_CENTER_API_KEY: process.env.COMMAND_CENTER_API_KEY,
    DEVICE_ID: process.env.DEVICE_ID,
    DEVICE_NAME: process.env.DEVICE_NAME,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    logger.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  let projects: ProjectConfig[] = [];
  try {
    projects = JSON.parse(process.env.PROJECTS ?? "[]");
  } catch {
    logger.warn("Failed to parse PROJECTS env var, using empty array");
  }

  return {
    commandCenterUrl: process.env.COMMAND_CENTER_URL!,
    apiKey: process.env.COMMAND_CENTER_API_KEY!,
    deviceId: process.env.DEVICE_ID!,
    deviceName: process.env.DEVICE_NAME!,
    hostname: process.env.HOSTNAME ?? "unknown",
    projects,
    opencodeBin: process.env.OPENCODE_BIN ?? "opencode",
  };
}
