import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { db } from "../../db";

export const resultsRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      return db.taskResult.findUnique({ where: { taskId: input.taskId } });
    }),

  getTranscript: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      const result = await db.taskResult.findUnique({
        where: { taskId: input.taskId },
        select: { fullTranscript: true },
      });
      return result?.fullTranscript ?? null;
    }),
});
