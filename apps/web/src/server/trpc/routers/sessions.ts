import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { db } from "../../db";

export const sessionsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          deviceId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return db.session.findMany({
        where: input?.deviceId ? { deviceId: input.deviceId } : undefined,
        include: {
          device: { select: { id: true, name: true, status: true } },
          currentTask: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { lastActiveAt: "desc" },
      });
    }),

  listByDevice: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .query(async ({ input }) => {
      return db.session.findMany({
        where: { deviceId: input.deviceId },
        include: {
          currentTask: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { lastActiveAt: "desc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.session.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          device: true,
          currentTask: {
            include: { subTodos: true, result: true },
          },
        },
      });
    }),

  syncSessionTitles: protectedProcedure
    .input(
      z.object({
        titles: z.array(
          z.object({
            sessionId: z.string(),
            title: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const results = await Promise.allSettled(
        input.titles.map((t) =>
          db.session.update({
            where: { id: t.sessionId },
            data: { title: t.title },
          })
        )
      );
      const updated = results.filter((r) => r.status === "fulfilled").length;
      return { updated, total: input.titles.length };
    }),

  getSessionDetail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const session = await db.session.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          device: { select: { id: true, name: true, hostname: true, status: true } },
          currentTask: {
            include: {
              subTodos: { orderBy: { position: "asc" } },
              result: true,
            },
          },
        },
      });

      const adminTodos = await db.adminTodo.findMany({
        where: { assignedSessionId: input.id },
        orderBy: { createdAt: "desc" },
      });

      return { ...session, adminTodos };
    }),

  getSessionTasks: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      return db.task.findMany({
        where: { sessionId: input.sessionId },
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
              verification: true,
              createdAt: true,
            },
          },
          project: { select: { id: true, name: true, path: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        projectPath: z.string(),
        opencodePort: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.session.create({
        data: {
          deviceId: input.deviceId,
          projectPath: input.projectPath,
          opencodePort: input.opencodePort,
        },
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["DISCOVERED", "IDLE", "BUSY", "DEAD"]),
      })
    )
    .mutation(async ({ input }) => {
      return db.session.update({
        where: { id: input.id },
        data: {
          status: input.status,
          lastActiveAt: new Date(),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.session.delete({ where: { id: input.id } });
    }),
});
