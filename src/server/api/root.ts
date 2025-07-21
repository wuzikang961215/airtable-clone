import { baseRouter } from "~/server/api/routers/base";
import { tableRouter } from "~/server/api/routers/table"; // ✅ Correct import
import { columnRouter } from "~/server/api/routers/column";
import { rowRouter } from "~/server/api/routers/row";
import { cellRouter } from "./routers/cell";
import { viewRouter } from "./routers/view"; 

import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  base: baseRouter,
  table: tableRouter, // ✅ Added once
  column: columnRouter,
  row: rowRouter,
  cell: cellRouter,
  view: viewRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);




