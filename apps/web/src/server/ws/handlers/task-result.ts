import type {
  TaskCompletedMessage,
  TaskFailedMessage,
} from "@opencode-cc/shared";
import { agentRegistry } from "../registry";
import { db } from "../../db";
import { sseBroadcaster } from "../sse";
import { dispatchPendingTasks } from "../dispatcher";

export async function handleTaskCompleted(
  msg: TaskCompletedMessage
): Promise<void> {
  // Update task status
  await db.task.update({
    where: { id: msg.taskId },
    data: {
      status: "DONE",
      completedAt: new Date(msg.timestamp),
    },
  });

  // Store result
  await db.taskResult.create({
    data: {
      taskId: msg.taskId,
      summary: msg.result.summary,
      filesChanged: msg.result.filesChanged as object[],
      tokensUsed: msg.result.tokensUsed,
      durationMs: msg.result.durationMs,
      fullTranscript: msg.result.fullTranscript as object,
    },
  });

  // Clear active task from registry
  agentRegistry.setActiveTask(msg.deviceId, null);

  // Get projectId for SSE
  const task = await db.task.findUnique({
    where: { id: msg.taskId },
    select: { projectId: true },
  });

  sseBroadcaster.broadcast({
    type: "task_completed",
    taskId: msg.taskId,
    projectId: task?.projectId ?? "",
  });

  console.log(`[WS] Task completed: ${msg.taskId}`);

  // Dispatch next pending task for this device
  await dispatchPendingTasks(msg.deviceId);
}

export async function handleTaskFailed(
  msg: TaskFailedMessage
): Promise<void> {
  await db.task.update({
    where: { id: msg.taskId },
    data: { status: "FAILED" },
  });

  agentRegistry.setActiveTask(msg.deviceId, null);

  const task = await db.task.findUnique({
    where: { id: msg.taskId },
    select: { projectId: true },
  });

  sseBroadcaster.broadcast({
    type: "task_failed",
    taskId: msg.taskId,
    projectId: task?.projectId ?? "",
    error: msg.error,
  });

  console.log(`[WS] Task failed: ${msg.taskId} — ${msg.error}`);

  // Try next task
  await dispatchPendingTasks(msg.deviceId);
}
