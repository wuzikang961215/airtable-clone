import { postRouter } from "~/server/api/routers/post";
import { baseRouter } from "~/server/api/routers/base";
import { tableRouter } from "~/server/api/routers/table"; // ✅ Correct import

import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  post: postRouter,
  base: baseRouter,
  table: tableRouter, // ✅ Added once
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
