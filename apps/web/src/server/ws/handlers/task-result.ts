import { adminOrchestrator } from "../../admin-orchestrator";
import type {
  TaskCompletedMessage,
  TaskFailedMessage,
} from "@opencode-cc/shared";
import { db } from "../../db";
import { sseBroadcaster } from "../sse";
import { dispatchToSession } from "../dispatcher";

export async function handleTaskCompleted(
  msg: TaskCompletedMessage
): Promise<void> {
  // Update task status
  const task = await db.task.update({
    where: { id: msg.taskId },
    data: {
      status: "DONE",
      completedAt: new Date(msg.timestamp),
    },
    select: { projectId: true, sessionId: true },
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

  // Update session to IDLE if task had a session
  if (task.sessionId) {
    await db.session.update({
      where: { id: task.sessionId },
      data: { status: "IDLE", lastActiveAt: new Date() },
    });
  }

  sseBroadcaster.broadcast({
    type: "task_completed",
    taskId: msg.taskId,
    projectId: task.projectId,
  });

  console.log(`[WS] Task completed: ${msg.taskId}`);

  // Dispatch next pending task for this session
  if (task.sessionId) {
    await dispatchToSession(task.sessionId);
  }

  // Check if this task is associated with an AdminTodo and trigger verification
  if (task.sessionId) {
    const adminTodo = await db.adminTodo.findFirst({
      where: { assignedSessionId: task.sessionId, status: "ASSIGNED" },
    });
    if (adminTodo) {
      await adminOrchestrator.verifyCompletedTodos();
    }
  }
}

export async function handleTaskFailed(
  msg: TaskFailedMessage
): Promise<void> {
  const task = await db.task.update({
    where: { id: msg.taskId },
    data: { status: "FAILED" },
    select: { projectId: true, sessionId: true },
  });

  // Update session to IDLE if task had a session
  if (task.sessionId) {
    await db.session.update({
      where: { id: task.sessionId },
      data: { status: "IDLE", lastActiveAt: new Date() },
    });
  }

  sseBroadcaster.broadcast({
    type: "task_failed",
    taskId: msg.taskId,
    projectId: task.projectId,
    error: msg.error,
  });

  console.log(`[WS] Task failed: ${msg.taskId} — ${msg.error}`);

  // Try next task for this session
  if (task.sessionId) {
    await dispatchToSession(task.sessionId);
  }
}
