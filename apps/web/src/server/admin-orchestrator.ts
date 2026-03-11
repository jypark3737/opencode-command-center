import { db } from "./db";
import { agentRegistry } from "./ws/registry";
import { sseBroadcaster } from "./ws/sse";
import { dispatchToSession } from "./ws/dispatcher";
import type { AdminRunCommandMessage } from "@opencode-cc/shared";

class AdminOrchestrator {
  // Map from requestId → todoIds for correlation
  private pendingConversions = new Map<string, string[]>();
  private pendingVerifications = new Map<string, string>(); // requestId → todoId

  async convertPendingTodos(): Promise<{
    dispatched: boolean;
    todoCount: number;
    reason?: string;
  }> {
    const pendingTodos = await db.adminTodo.findMany({
      where: { status: "PENDING" },
      take: 5,
      orderBy: { createdAt: "asc" },
    });

    if (pendingTodos.length === 0) {
      return { dispatched: false, todoCount: 0, reason: "No pending todos" };
    }

    const connections = agentRegistry.getAll();
    if (connections.length === 0) {
      return {
        dispatched: false,
        todoCount: 0,
        reason: "No devices connected",
      };
    }

    const conn = connections[0];
    const requestId = crypto.randomUUID();

    // Build batch conversion prompt
    const todoList = pendingTodos
      .map((t, i) => `${i + 1}. [ID: ${t.id}] ${t.content}`)
      .join("\n");
    const command = `You are a technical task converter. Convert these natural language tasks into precise, actionable coding instructions.

Tasks:
${todoList}

Respond with ONLY a JSON array (no markdown, no explanation, no code blocks):
[{"todoId":"<exact id>","title":"short title","instruction":"detailed step-by-step coding instruction"},...]

Use the exact IDs shown above. One object per task.`;

    // Track this request
    this.pendingConversions.set(
      requestId,
      pendingTodos.map((t) => t.id)
    );

    // Update todos to CONVERTING
    await db.adminTodo.updateMany({
      where: { id: { in: pendingTodos.map((t) => t.id) } },
      data: { status: "CONVERTING" },
    });

    // Broadcast status
    sseBroadcaster.broadcast({
      type: "admin_orchestrator_status",
      isProcessing: true,
      currentAction: "Converting todos to instructions...",
      queueLength: pendingTodos.length,
    });

    // Send WS command to daemon
    const msg: AdminRunCommandMessage = {
      type: "admin_run_command",
      requestId,
      command,
    };
    conn.ws.send(JSON.stringify(msg));

    return { dispatched: true, todoCount: pendingTodos.length };
  }

  async assignReadyTodos(): Promise<{ assigned: number }> {
    const readyTodos = await db.adminTodo.findMany({
      where: { status: "READY" },
      orderBy: { createdAt: "asc" },
    });

    if (readyTodos.length === 0) return { assigned: 0 };

    // Get idle sessions
    const idleSessions = await db.session.findMany({
      where: { status: "IDLE" },
    });

    if (idleSessions.length === 0) return { assigned: 0 };

    let assigned = 0;

    for (
      let i = 0;
      i < Math.min(readyTodos.length, idleSessions.length);
      i++
    ) {
      const todo = readyTodos[i];
      const session = idleSessions[i];

      try {
        // Find the project for this session
        const project = await db.project.findFirst({
          where: {
            deviceId: session.deviceId,
            path: session.projectPath,
          },
        });

        if (!project) {
          console.warn(
            `[Orchestrator] No project found for session ${session.id} at ${session.projectPath}`
          );
          continue;
        }

        // Get last task position
        const lastTask = await db.task.findFirst({
          where: { projectId: project.id },
          orderBy: { position: "desc" },
          select: { position: true },
        });
        const position = (lastTask?.position ?? -1) + 1;

        // Extract title from instruction (first line or first 80 chars)
        const instruction = todo.convertedInstruction ?? todo.content;
        const title = instruction.split("\n")[0].slice(0, 80);

        // Create task for this todo
        await db.task.create({
          data: {
            projectId: project.id,
            title,
            description: instruction,
            position,
          },
        });

        // Update the AdminTodo
        await db.adminTodo.update({
          where: { id: todo.id },
          data: {
            status: "ASSIGNED",
            assignedSessionId: session.id,
            assignedDeviceId: session.deviceId,
          },
        });

        // Dispatch the task to the session
        await dispatchToSession(session.id);

        // Broadcast SSE
        sseBroadcaster.broadcast({
          type: "admin_todo_status_changed",
          todoId: todo.id,
          oldStatus: "READY",
          newStatus: "ASSIGNED",
          assignedSessionId: session.id,
        });

        console.log(
          `[Orchestrator] Assigned todo "${todo.content.slice(0, 40)}" to session ${session.id}`
        );
        assigned++;
      } catch (err) {
        console.error(
          `[Orchestrator] Failed to assign todo ${todo.id}:`,
          err
        );
      }
    }

    return { assigned };
  }

  // Called by WS handler when admin_run_result arrives
  getPendingTodoIds(requestId: string): string[] | undefined {
    const ids = this.pendingConversions.get(requestId);
    this.pendingConversions.delete(requestId);
    return ids;
  }


  // Called by WS handler when admin_run_result is a verification result
  getPendingVerificationTodoId(requestId: string): string | undefined {
    const id = this.pendingVerifications.get(requestId);
    this.pendingVerifications.delete(requestId);
    return id;
  }

  async verifyCompletedTodos(): Promise<void> {
    const assignedTodos = await db.adminTodo.findMany({
      where: { status: "ASSIGNED" },
    });

    for (const todo of assignedTodos) {
      if (!todo.assignedSessionId) continue;

      // Find a completed task for this session
      const doneTask = await db.task.findFirst({
        where: { sessionId: todo.assignedSessionId, status: "DONE" },
        include: { result: true },
      });

      if (!doneTask || !doneTask.result) continue;

      const taskResult = doneTask.result;
      const requestId = crypto.randomUUID();

      // Update todo to VERIFYING
      await db.adminTodo.update({
        where: { id: todo.id },
        data: { status: "VERIFYING" },
      });

      const command = `You are a critical code reviewer. Verify this task completion.

Original request: ${todo.content}
Instruction given: ${todo.convertedInstruction ?? todo.content}

Worker's summary: ${taskResult.summary}
Files changed: ${JSON.stringify(taskResult.filesChanged)}

Does the work match the request? Check:
1. All requirements addressed?
2. No obvious errors or omissions?
3. Files changed make sense for the task?

Respond with ONLY a JSON object (no markdown, no code blocks):
{"passed":true,"feedback":"brief explanation","corrections":"what to fix if failed"}`;

      this.pendingVerifications.set(requestId, todo.id);

      const connections = agentRegistry.getAll();
      if (connections.length === 0) {
        console.warn("[Orchestrator] No devices connected for verification");
        // Revert status
        await db.adminTodo.update({
          where: { id: todo.id },
          data: { status: "ASSIGNED" },
        });
        this.pendingVerifications.delete(requestId);
        continue;
      }

      const msg: AdminRunCommandMessage = {
        type: "admin_run_command",
        requestId,
        command,
      };
      connections[0].ws.send(JSON.stringify(msg));

      sseBroadcaster.broadcast({
        type: "admin_orchestrator_status",
        isProcessing: true,
        currentAction: "Verifying completed work...",
        queueLength: 1,
      });

      console.log(`[Orchestrator] Sent verification for todo ${todo.id}`);
    }
  }
}

const globalForOrchestrator = globalThis as unknown as { __adminOrchestrator?: AdminOrchestrator };
globalForOrchestrator.__adminOrchestrator ??= new AdminOrchestrator();
export const adminOrchestrator = globalForOrchestrator.__adminOrchestrator;
