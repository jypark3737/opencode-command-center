import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { db } from "../../db";

export const devicesRouter = createTRPCRouter({
  list: protectedProcedure.query(async () => {
    return db.device.findMany({
      include: {
        projects: { select: { id: true, name: true, path: true } },
        _count: { select: { taskAssignments: true } },
      },
      orderBy: { registeredAt: "asc" },
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.device.findUniqueOrThrow({ where: { id: input.id } });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        hostname: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return db.device.create({ data: input });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.device.delete({ where: { id: input.id } });
    }),
});
