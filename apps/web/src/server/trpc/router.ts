import { createTRPCRouter } from "./init";
import { devicesRouter } from "./routers/devices";
import { projectsRouter } from "./routers/projects";
import { tasksRouter } from "./routers/tasks";
import { resultsRouter } from "./routers/results";
import { adminRouter } from "./routers/admin";

export const appRouter = createTRPCRouter({
  devices: devicesRouter,
  projects: projectsRouter,
  tasks: tasksRouter,
  results: resultsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
