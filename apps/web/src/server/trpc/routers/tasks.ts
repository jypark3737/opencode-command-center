import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { db } from "../../db";
import type { AssignTaskMessage } from "@opencode-cc/shared";
import { agentRegistry } from "../../ws/registry";

export const tasksRouter = createTRPCRouter({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.task.findMany({
        where: { projectId: input.projectId },
        include: {
          subTodos: { orderBy: { position: "asc" } },
          session: {
            select: { id: true, status: true, projectPath: true, title: true },
          },
          result: {
            select: {
              id: true,
              summary: true,
              filesChanged: true,
              tokensUsed: true,
              durationMs: true,
              adminReview: true,
              verification: true,
              createdAt: true,
            },
          },
        },
        orderBy: { position: "asc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.task.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          subTodos: { orderBy: { position: "asc" } },
          result: true,
          session: true,
          project: { select: { id: true, name: true, path: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        position: z.number().int().optional(),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Auto-assign position if not provided
      if (input.position === undefined) {
        const lastTask = await db.task.findFirst({
          where: { projectId: input.projectId },
          orderBy: { position: "desc" },
          select: { position: true },
        });
        input.position = (lastTask?.position ?? -1) + 1;
      }
      return db.task.create({ data: input });
    }),

  assignToSession: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Get session info
      const session = await db.session.findUniqueOrThrow({
        where: { id: input.sessionId },
      });

      // Get task with project info (including verification config)
      const task = await db.task.findUniqueOrThrow({
        where: { id: input.taskId },
        include: {
          project: {
            select: {
              path: true,
              verificationType: true,
              verifyCommand: true,
            },
          },
        },
      });

      // Update task to ASSIGNED with session link
      await db.task.update({
        where: { id: input.taskId },
        data: {
          status: "ASSIGNED",
          sessionId: input.sessionId,
          assignedDeviceId: session.deviceId,
        },
      });

      // Update session to BUSY
      await db.session.update({
        where: { id: input.sessionId },
        data: { status: "BUSY", lastActiveAt: new Date() },
      });

      // Send WS assign_task message to daemon
      const conn = agentRegistry.get(session.deviceId);
      if (conn) {
        const msg: AssignTaskMessage = {
          type: "assign_task",
          taskId: input.taskId,
          sessionId: input.sessionId,
          projectPath: task.project.path,
          title: task.title,
          description: task.description ?? task.title,
          verification: {
            type: task.project.verificationType,
            command: task.project.verifyCommand ?? undefined,
          },
        };
        conn.ws.send(JSON.stringify(msg));
      }

      return { taskId: input.taskId, sessionId: input.sessionId };
    }),

  updatePosition: protectedProcedure
    .input(z.object({ id: z.string(), position: z.number().int() }))
    .mutation(async ({ input }) => {
      return db.task.update({
        where: { id: input.id },
        data: { position: input.position },
      });
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.task.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.task.delete({ where: { id: input.id } });
    }),

  getSubTodos: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      return db.subTodo.findMany({
        where: { taskId: input.taskId },
        orderBy: { position: "asc" },
      });
    }),
});
