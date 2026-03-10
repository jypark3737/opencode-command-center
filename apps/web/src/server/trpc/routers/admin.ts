import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { db } from "../../db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

  reviewTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input }) => {
      const result = await db.taskResult.findUnique({
        where: { taskId: input.taskId },
        include: { task: { include: { project: true } } },
      });

      if (!result) throw new Error("No result found for task");

      const filesChanged = result.filesChanged as Array<{ path: string; status: string }>;
      const fileList = filesChanged.map((f) => `${f.status}: ${f.path}`).join("\n");

      const prompt = `You are reviewing an AI coding task completion. Provide a brief, honest assessment.

Task: ${result.task.title}
Project: ${result.task.project.name}
Description: ${result.task.description ?? "No description"}

Summary of what was done:
${result.summary}

Files changed:
${fileList || "No files recorded"}

Tokens used: ${result.tokensUsed}
Duration: ${Math.round(result.durationMs / 1000)}s

Please provide:
1. A one-line verdict (e.g., "Looks good", "Needs review", "Potential issues")
2. 2-3 sentences of notes about the implementation quality, any concerns, or suggestions

Format your response as:
VERDICT: <one line>
NOTES: <2-3 sentences>`;

      const message = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      });

      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "";

      const verdictMatch = responseText.match(/VERDICT:\s*(.+)/);
      const notesMatch = responseText.match(/NOTES:\s*([\s\S]+)/);

      const verdict = verdictMatch?.[1]?.trim() ?? "Review complete";
      const notes = notesMatch?.[1]?.trim() ?? responseText;

      const adminReview = {
        verdict,
        notes,
        reviewedAt: new Date().toISOString(),
      };

      await db.taskResult.update({
        where: { taskId: input.taskId },
        data: { adminReview },
      });

      return adminReview;
    }),
});
