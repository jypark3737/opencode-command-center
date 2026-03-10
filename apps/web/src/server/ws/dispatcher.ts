import type { AssignTaskMessage } from "@opencode-cc/shared";
import { agentRegistry } from "./registry";
import { db } from "../db";

export async function dispatchPendingTasks(deviceId: string): Promise<void> {
  const conn = agentRegistry.get(deviceId);
  if (!conn) return;

  // Skip if agent already has an active task
  if (conn.activeTaskId) return;

  // Find a PENDING task for any project this agent manages
  const projectPaths = conn.projects.map((p) => p.path);
  if (projectPaths.length === 0) return;

  // Find projects on this device
  const projects = await db.project.findMany({
    where: {
      deviceId,
      path: { in: projectPaths },
    },
    select: { id: true, path: true },
  });

  if (projects.length === 0) return;

  const projectIds = projects.map((p) => p.id);

  // Find oldest PENDING task for these projects (one at a time per device)
  const task = await db.task.findFirst({
    where: {
      projectId: { in: projectIds },
      status: "PENDING",
    },
    include: {
      project: { select: { path: true } },
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  if (!task) return;

  // Claim the task (mark as ASSIGNED atomically)
  const claimed = await db.task.updateMany({
    where: { id: task.id, status: "PENDING" }, // Only update if still PENDING
    data: {
      status: "ASSIGNED",
      assignedDeviceId: deviceId,
    },
  });

  if (claimed.count === 0) return; // Race condition — another device claimed it

  // Update registry
  agentRegistry.setActiveTask(deviceId, task.id);

  // Send assignment to agent
  const msg: AssignTaskMessage = {
    type: "assign_task",
    taskId: task.id,
    projectPath: task.project.path,
    title: task.title,
    description: task.description ?? task.title,
  };

  conn.ws.send(JSON.stringify(msg));
  console.log(
    `[Dispatcher] Assigned task "${task.title}" to ${conn.deviceName}`
  );
}

// Called periodically to dispatch tasks to idle agents
export async function dispatchAll(): Promise<void> {
  const agents = agentRegistry.getAll();
  for (const agent of agents) {
    if (!agent.activeTaskId) {
      await dispatchPendingTasks(agent.deviceId);
    }
  }
}
