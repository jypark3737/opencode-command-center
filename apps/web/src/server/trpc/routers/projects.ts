import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { db } from "../../db";

export const projectsRouter = createTRPCRouter({
  list: protectedProcedure.query(async () => {
    return db.project.findMany({
      include: {
        device: { select: { id: true, name: true, status: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.project.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          device: true,
          tasks: {
            include: { subTodos: true, result: true },
            orderBy: { position: "asc" },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        path: z.string().min(1),
        description: z.string().optional(),
        deviceId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return db.project.create({ data: input });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.project.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.project.delete({ where: { id: input.id } });
    }),
});
