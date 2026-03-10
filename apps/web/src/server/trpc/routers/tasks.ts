import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { db } from "../../db";

export const tasksRouter = createTRPCRouter({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.task.findMany({
        where: { projectId: input.projectId },
        include: {
          subTodos: { orderBy: { position: "asc" } },
          result: {
            select: {
              id: true,
              summary: true,
              filesChanged: true,
              tokensUsed: true,
              durationMs: true,
              adminReview: true,
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
