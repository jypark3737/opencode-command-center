import type { AssignTaskMessage } from "@opencode-cc/shared";
import { agentRegistry } from "./registry";
import { db } from "../db";

export async function dispatchToSession(sessionId: string): Promise<void> {
  // Get session info
  const session = await db.session.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.status !== "IDLE") return;

  const conn = agentRegistry.get(session.deviceId);
  if (!conn) return;

  // Find projects on this device that match this session's projectPath
  const project = await db.project.findFirst({
    where: {
      deviceId: session.deviceId,
      path: session.projectPath,
    },
    select: { id: true, path: true, verificationType: true, verifyCommand: true },
  });

  if (!project) return;

  // Find oldest PENDING task for this project
  const task = await db.task.findFirst({
    where: {
      projectId: project.id,
      status: "PENDING",
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  if (!task) return;

  // Claim the task atomically
  const claimed = await db.task.updateMany({
    where: { id: task.id, status: "PENDING" },
    data: {
      status: "ASSIGNED",
      assignedDeviceId: session.deviceId,
      sessionId: sessionId,
    },
  });

  if (claimed.count === 0) return; // Race condition — another session claimed it

  // Update session to BUSY
  await db.session.update({
    where: { id: sessionId },
    data: { status: "BUSY", lastActiveAt: new Date() },
  });

  // Send assignment to agent
  const msg: AssignTaskMessage = {
    type: "assign_task",
    taskId: task.id,
    sessionId: sessionId,
    projectPath: project.path,
    title: task.title,
    description: task.description ?? task.title,
    verification: {
      type: project.verificationType,
      command: project.verifyCommand ?? undefined,
    },
  };

  conn.ws.send(JSON.stringify(msg));
  console.log(
    `[Dispatcher] Assigned task "${task.title}" to session ${sessionId} on ${conn.deviceName}`
  );
}

// Called periodically or after events to dispatch tasks to all idle sessions
export async function dispatchAll(): Promise<void> {
  const idleSessions = await db.session.findMany({
    where: { status: "IDLE" },
  });

  for (const session of idleSessions) {
    await dispatchToSession(session.id);
  }
}
