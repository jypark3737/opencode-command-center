import type {
  SessionsDiscoveredMessage,
  SessionStatusMessage,
  TaskVerificationMessage,
} from "@opencode-cc/shared";
import { db } from "../../db";
import { sseBroadcaster } from "../sse";
import { dispatchToSession } from "../dispatcher";

export async function handleSessionsDiscovered(
  msg: SessionsDiscoveredMessage
): Promise<void> {
  for (const sessionInfo of msg.sessions) {
    // Upsert session: match by deviceId + opencodeSessionId, or deviceId + projectPath
    const existing = await db.session.findFirst({
      where: {
        deviceId: msg.deviceId,
        OR: [
          { opencodeSessionId: sessionInfo.opencodeSessionId },
          { projectPath: sessionInfo.projectPath },
        ],
      },
    });

    let session;
    if (existing) {
      session = await db.session.update({
        where: { id: existing.id },
        data: {
          opencodeSessionId: sessionInfo.opencodeSessionId,
          projectPath: sessionInfo.projectPath,
          opencodePort: sessionInfo.port,
          title: sessionInfo.title ?? undefined,
          status: "IDLE",
          lastActiveAt: new Date(),
        },
      });
    } else {
      session = await db.session.create({
        data: {
          deviceId: msg.deviceId,
          projectPath: sessionInfo.projectPath,
          opencodeSessionId: sessionInfo.opencodeSessionId,
          opencodePort: sessionInfo.port,
          title: sessionInfo.title ?? undefined,
          status: "IDLE",
        },
      });
    }

    // Broadcast to dashboard
    sseBroadcaster.broadcast({
      type: "session_discovered",
      deviceId: msg.deviceId,
      sessionId: session.id,
      projectPath: sessionInfo.projectPath,
    });

    console.log(
      `[WS] Session discovered: ${session.id} (${sessionInfo.projectPath}) on device ${msg.deviceId}`
    );

    // Try to dispatch a task to this newly idle session
    await dispatchToSession(session.id);
  }
}

export async function handleSessionStatus(
  msg: SessionStatusMessage
): Promise<void> {
  await db.session.update({
    where: { id: msg.sessionId },
    data: {
      status: msg.status,
      lastActiveAt: new Date(),
    },
  });

  // Broadcast to dashboard
  sseBroadcaster.broadcast({
    type: "session_status_changed",
    sessionId: msg.sessionId,
    deviceId: msg.deviceId,
    status: msg.status,
  });

  console.log(
    `[WS] Session ${msg.sessionId} status changed to ${msg.status}`
  );

  // If session became IDLE, try to dispatch next task
  if (msg.status === "IDLE") {
    await dispatchToSession(msg.sessionId);
  }
}

export async function handleTaskVerification(
  msg: TaskVerificationMessage
): Promise<void> {
  // Store verification result on TaskResult
  const taskResult = await db.taskResult.findUnique({
    where: { taskId: msg.taskId },
  });

  if (taskResult) {
    await db.taskResult.update({
      where: { taskId: msg.taskId },
      data: {
        verification: msg.verification,
      },
    });
  }

  // Get projectId for event
  const task = await db.task.findUnique({
    where: { id: msg.taskId },
    select: { projectId: true },
  });

  // Broadcast to dashboard
  sseBroadcaster.broadcast({
    type: "task_verification_result",
    taskId: msg.taskId,
    projectId: task?.projectId ?? "",
    passed: msg.verification.passed,
  });

  console.log(
    `[WS] Task ${msg.taskId} verification: ${msg.verification.passed ? "PASSED" : "FAILED"}`
  );
}
