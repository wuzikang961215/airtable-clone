import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const viewRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.view.findUnique({
        where: { id: input.viewId },
      });
    }),

  getByTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.view.findMany({
        where: { tableId: input.tableId },
        orderBy: { createdAt: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        name: z.string(),
        type: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.view.create({
        data: {
          tableId: input.tableId,
          name: input.name,
          filters: [],
          sorts: [],
          hiddenColumns: [],
          columnOrder: await ctx.prisma.column.findMany({
            where: { tableId: input.tableId },
            select: { id: true },
          }).then((cols) => cols.map((c) => c.id)),
        },
      });
    }),

    updateConfig: protectedProcedure
    .input(
      z.object({
        viewId: z.string(),
        columnOrder: z.array(z.string()).optional(),
        hiddenColumnIds: z.array(z.string()).optional(),
        sorts: z
          .array(
            z.object({
              columnId: z.string(),
              direction: z.enum(["asc", "desc"]),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.view.update({
        where: { id: input.viewId },
        data: {
          columnOrder: input.columnOrder,
          hiddenColumns: input.hiddenColumnIds,
          sorts: input.sorts,
        },
      });
    }),  
});
