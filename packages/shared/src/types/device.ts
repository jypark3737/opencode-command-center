export type DeviceStatus = "ONLINE" | "OFFLINE" | "STALE";

export interface Device {
  id: string;
  name: string;
  hostname: string;
  status: DeviceStatus;
  lastHeartbeat: Date | null;
  registeredAt: Date;
  updatedAt: Date;
}

export interface CreateDeviceInput {
  name: string;
  hostname: string;
}
