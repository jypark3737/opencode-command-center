import type {
  TaskStartedMessage,
  SubTodosUpdatedMessage,
} from "@opencode-cc/shared";
import { db } from "../../db";
import { sseBroadcaster } from "../sse";

export async function handleTaskStarted(
  msg: TaskStartedMessage
): Promise<void> {
  await db.task.update({
    where: { id: msg.taskId },
    data: {
      status: "RUNNING",
      opencodeSessionId: msg.opencodeSessionId,
      startedAt: new Date(msg.timestamp),
    },
  });

  // Get projectId for SSE event
  const task = await db.task.findUnique({
    where: { id: msg.taskId },
    select: { projectId: true },
  });

  sseBroadcaster.broadcast({
    type: "task_status_changed",
    taskId: msg.taskId,
    status: "RUNNING",
    projectId: task?.projectId ?? "",
  });

  console.log(`[WS] Task started: ${msg.taskId} on device ${msg.deviceId}`);
}

export async function handleSubTodosUpdated(
  msg: SubTodosUpdatedMessage
): Promise<void> {
  // Upsert all subtodos for this task
  await db.$transaction(
    msg.subTodos.map((todo, index) =>
      db.subTodo.upsert({
        where: {
          // Use a deterministic ID based on task + position index
          id: `${msg.taskId}-${index}`,
        },
        update: {
          content: todo.content,
          checked: todo.checked,
          position: todo.position,
        },
        create: {
          id: `${msg.taskId}-${index}`,
          taskId: msg.taskId,
          content: todo.content,
          checked: todo.checked,
          position: todo.position,
        },
      })
    )
  );

  sseBroadcaster.broadcast({
    type: "subtodos_updated",
    taskId: msg.taskId,
    subTodos: msg.subTodos,
  });
}
