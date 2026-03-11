import path from "node:path";
import { logger } from "./logger";

export interface DaemonConfig {
  commandCenterUrl: string;
  apiKey: string;
  deviceId: string;
  deviceName: string;
  hostname: string;
  opencodeBin: string;
  opencodeDbPath: string;
}

function normalized(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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

  const home = normalized(process.env.HOME) ?? "/root";
  const xdgDataHome =
    normalized(process.env.XDG_DATA_HOME) ?? path.join(home, ".local", "share");
  const opencodeHome =
    normalized(process.env.OPENCODE_HOME) ?? path.join(xdgDataHome, "opencode");
  const defaultDbPath = path.join(
    opencodeHome,
    process.env.DEVICE_ID!,
    "opencode.db"
  );

  return {
    commandCenterUrl: process.env.COMMAND_CENTER_URL!,
    apiKey: process.env.COMMAND_CENTER_API_KEY!,
    deviceId: process.env.DEVICE_ID!,
    deviceName: process.env.DEVICE_NAME!,
    hostname: process.env.HOSTNAME ?? "unknown",
    opencodeBin: normalized(process.env.OPENCODE_BIN) ?? "opencode",
    opencodeDbPath: normalized(process.env.OPENCODE_DB_PATH) ?? defaultDbPath,
  };
}
