import type { AdminRunResultMessage, AdminRunCommandMessage } from "@opencode-cc/shared";
import { db } from "../../db";
import { sseBroadcaster } from "../sse";
import { adminOrchestrator } from "../../admin-orchestrator";
import { agentRegistry } from "../../ws/registry";

export async function handleAdminRunResult(
  msg: AdminRunResultMessage
): Promise<void> {
  console.log(
    `[WS] Admin run result for request ${msg.requestId}: exit ${msg.exitCode}`
  );

  // Check if this is a verification result (not a conversion result)
  const verifyTodoId = adminOrchestrator.getPendingVerificationTodoId(msg.requestId);
  if (verifyTodoId !== undefined) {
    await handleVerificationResult(msg, verifyTodoId);
    return;
  }

  if (msg.exitCode !== 0 || msg.error) {
    console.error(`[WS] Admin run failed: ${msg.error ?? "non-zero exit"}`);
    // Find todos that are CONVERTING and reset them to PENDING
    const converting = await db.adminTodo.findMany({
      where: { status: "CONVERTING" },
    });
    for (const todo of converting) {
      await db.adminTodo.update({
        where: { id: todo.id },
        data: { status: "PENDING" },
      });
      sseBroadcaster.broadcast({
        type: "admin_todo_status_changed",
        todoId: todo.id,
        oldStatus: "CONVERTING",
        newStatus: "PENDING",
      });
    }
    sseBroadcaster.broadcast({
      type: "admin_orchestrator_status",
      isProcessing: false,
      currentAction: "idle",
      queueLength: 0,
      lastError: msg.error ?? "Command failed",
    });
    return;
  }

  // Try to parse JSON output from opencode run
  let parsed: Array<{
    todoId: string;
    title: string;
    instruction: string;
  }> = [];

  try {
    // Extract JSON from output (may have surrounding text)
    const jsonMatch = msg.output.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error("[WS] Failed to parse admin run output as JSON:", err);
  }

  if (parsed.length === 0) {
    console.warn("[WS] No valid JSON instructions found in admin run output");
    // Reset CONVERTING todos back to PENDING
    const converting = await db.adminTodo.findMany({
      where: { status: "CONVERTING" },
    });
    for (const todo of converting) {
      await db.adminTodo.update({
        where: { id: todo.id },
        data: { status: "PENDING" },
      });
    }
    sseBroadcaster.broadcast({
      type: "admin_orchestrator_status",
      isProcessing: false,
      currentAction: "idle",
      queueLength: 0,
      lastError: "Could not parse conversion output",
    });
    return;
  }

  // Update each todo with its converted instruction
  for (const item of parsed) {
    try {
      const todo = await db.adminTodo.findUnique({ where: { id: item.todoId } });
      if (!todo || todo.status !== "CONVERTING") continue;

      await db.adminTodo.update({
        where: { id: item.todoId },
        data: {
          convertedInstruction: item.instruction,
          status: "READY",
        },
      });

      sseBroadcaster.broadcast({
        type: "admin_todo_status_changed",
        todoId: item.todoId,
        oldStatus: "CONVERTING",
        newStatus: "READY",
        convertedInstruction: item.instruction,
      });
    } catch (err) {
      console.error(`[WS] Failed to update todo ${item.todoId}:`, err);
    }
  }

  sseBroadcaster.broadcast({
    type: "admin_orchestrator_status",
    isProcessing: false,
    currentAction: "idle",
    queueLength: 0,
  });

  console.log(`[WS] Updated ${parsed.length} todos to READY status`);

  // Auto-assign ready todos to idle sessions
  try {
    const { assigned } = await adminOrchestrator.assignReadyTodos();
    if (assigned > 0) {
      console.log(`[WS] Auto-assigned ${assigned} todos to idle sessions`);
    }
  } catch (err) {
    console.error("[WS] Auto-assign failed:", err);
  }
}

async function handleVerificationResult(
  msg: AdminRunResultMessage,
  todoId: string
): Promise<void> {
  const todo = await db.adminTodo.findUnique({ where: { id: todoId } });
  if (!todo) return;

  if (msg.exitCode !== 0 || msg.error) {
    // Reset to ASSIGNED so it can be retried later
    await db.adminTodo.update({ where: { id: todoId }, data: { status: "ASSIGNED" } });
    sseBroadcaster.broadcast({
      type: "admin_orchestrator_status",
      isProcessing: false,
      currentAction: "idle",
      queueLength: 0,
      lastError: msg.error ?? "Verification command failed",
    });
    return;
  }

  let parsed: { passed: boolean; feedback?: string; corrections?: string } | null = null;
  try {
    const jsonMatch = msg.output.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("[WS] Failed to parse verification result JSON:", err);
  }

  if (!parsed) {
    // Can't parse — reset to ASSIGNED for retry
    await db.adminTodo.update({ where: { id: todoId }, data: { status: "ASSIGNED" } });
    return;
  }

  if (parsed.passed) {
    await db.adminTodo.update({
      where: { id: todoId },
      data: { status: "DONE", completedAt: new Date() },
    });
    sseBroadcaster.broadcast({
      type: "admin_verification_result",
      todoId,
      passed: true,
      feedback: parsed.feedback,
      retryCount: todo.retryCount,
    });
    sseBroadcaster.broadcast({
      type: "admin_todo_status_changed",
      todoId,
      oldStatus: "VERIFYING",
      newStatus: "DONE",
    });
    console.log(`[WS] Todo ${todoId} verified and marked DONE`);
  } else {
    const newRetryCount = todo.retryCount + 1;
    if (newRetryCount <= todo.maxRetries) {
      await db.adminTodo.update({
        where: { id: todoId },
        data: { retryCount: newRetryCount, status: "ASSIGNED" },
      });
      sseBroadcaster.broadcast({
        type: "admin_verification_result",
        todoId,
        passed: false,
        feedback: parsed.feedback,
        retryCount: newRetryCount,
      });
      // Send correction command to daemon
      const connections = agentRegistry.getAll();
      if (connections.length > 0) {
        const correctionRequestId = crypto.randomUUID();
        const correctionMsg: AdminRunCommandMessage = {
          type: "admin_run_command",
          requestId: correctionRequestId,
          command: `Fix the following issues in your previous work:\n\n${parsed.corrections ?? parsed.feedback}\n\nOriginal task: ${todo.convertedInstruction ?? todo.content}`,
        };
        connections[0].ws.send(JSON.stringify(correctionMsg));
      }
      console.log(`[WS] Todo ${todoId} verification failed (retry ${newRetryCount}/${todo.maxRetries})`);
    } else {
      await db.adminTodo.update({
        where: { id: todoId },
        data: { status: "FAILED", verificationNotes: parsed.feedback },
      });
      sseBroadcaster.broadcast({
        type: "admin_todo_escalated",
        todoId,
        content: todo.content,
        verificationNotes: parsed.feedback,
        retryCount: todo.retryCount,
      });
      sseBroadcaster.broadcast({
        type: "admin_todo_status_changed",
        todoId,
        oldStatus: "VERIFYING",
        newStatus: "FAILED",
      });
      console.log(`[WS] Todo ${todoId} escalated after ${todo.retryCount} retries`);
    }
  }
}
