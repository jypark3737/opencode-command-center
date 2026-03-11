import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { db } from "../../db";
import { adminOrchestrator } from "../../admin-orchestrator";

export const adminRouter = createTRPCRouter({
  getSystemStatus: protectedProcedure.query(async () => {
    const [devices, activeTasks, pendingTasks, totalTasks] = await Promise.all([
      db.device.findMany({
        select: { id: true, name: true, status: true, lastHeartbeat: true },
      }),
      db.task.count({ where: { status: { in: ["ASSIGNED", "RUNNING"] } } }),
      db.task.count({ where: { status: "PENDING" } }),
      db.task.count(),
    ]);

    return {
      devices,
      stats: {
        activeTasks,
        pendingTasks,
        totalTasks,
        onlineDevices: devices.filter((d) => d.status === "ONLINE").length,
      },
    };
  }),

  getHealthReport: protectedProcedure.query(async () => {
    const staleThreshold = new Date(Date.now() - 2 * 60 * 1000);

    const [staleDevices, stuckTasks] = await Promise.all([
      db.device.findMany({
        where: {
          status: "ONLINE",
          lastHeartbeat: { lt: staleThreshold },
        },
        select: { id: true, name: true, lastHeartbeat: true },
      }),
      db.task.findMany({
        where: {
          status: { in: ["ASSIGNED", "RUNNING"] },
          startedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
        },
        select: {
          id: true,
          title: true,
          status: true,
          startedAt: true,
          project: { select: { name: true } },
        },
      }),
    ]);

    return { staleDevices, stuckTasks };
  }),

  submitTodos: protectedProcedure
    .input(z.object({ content: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const lines = input.content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const created = await Promise.all(
        lines.map((line) =>
          db.adminTodo.create({
            data: { content: line },
          })
        )
      );

      return created;
    }),

  getTodos: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "PENDING",
              "CONVERTING",
              "READY",
              "ASSIGNED",
              "VERIFYING",
              "DONE",
              "FAILED",
              "CANCELLED",
            ])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return db.adminTodo.findMany({
        where: input?.status ? { status: input.status } : undefined,
        orderBy: { createdAt: "desc" },
      });
    }),

  cancelTodo: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.adminTodo.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
    }),

  getOrchestratorStatus: protectedProcedure.query(async () => {
    const [pending, converting, ready, assigned, verifying] = await Promise.all([
      db.adminTodo.count({ where: { status: "PENDING" } }),
      db.adminTodo.count({ where: { status: "CONVERTING" } }),
      db.adminTodo.count({ where: { status: "READY" } }),
      db.adminTodo.count({ where: { status: "ASSIGNED" } }),
      db.adminTodo.count({ where: { status: "VERIFYING" } }),
    ]);

    const isProcessing = converting > 0 || verifying > 0;
    const queueLength = pending + converting + ready + assigned + verifying;

    return {
      isProcessing,
      currentAction: converting > 0
        ? "Converting todos to instructions..."
        : verifying > 0
        ? "Verifying completed tasks..."
        : "idle",
      queueLength,
    };
  }),

  triggerOrchestration: protectedProcedure.mutation(async () => {
    const convertResult = await adminOrchestrator.convertPendingTodos();
    if (!convertResult.dispatched) {
      // If nothing to convert, try assigning READY todos
      const assignResult = await adminOrchestrator.assignReadyTodos();
      return {
        dispatched: false,
        todoCount: 0,
        assigned: assignResult.assigned,
        reason: convertResult.reason,
      };
    }
    return { dispatched: true, todoCount: convertResult.todoCount };
  }),
});
