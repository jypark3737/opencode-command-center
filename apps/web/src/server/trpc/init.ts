import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { validateApiKey } from "../auth";

export interface Context {
  apiKey: string | null;
}

export function createContext(opts: { req: Request }): Context {
  const apiKey =
    opts.req.headers.get("x-api-key") ??
    opts.req.headers.get("authorization")?.replace("Bearer ", "") ??
    null;
  return { apiKey };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!validateApiKey(ctx.apiKey)) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});
