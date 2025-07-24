import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// Import the same filter and sort schemas from row router for consistency
const textFilterSchema = z.object({
  columnId: z.string(),
  columnType: z.literal("text"),
  operator: z.enum(["contains", "equals", "not_contains", "is_empty", "is_not_empty"]),
  value: z.string().optional(),
});

const numberFilterSchema = z.object({
  columnId: z.string(),
  columnType: z.literal("number"),
  operator: z.enum(["equals", "greater_than", "less_than", "greater_equal", "less_equal", "is_empty", "is_not_empty"]),
  value: z.number().optional(),
});

const filterSchema = z.discriminatedUnion("columnType", [
  textFilterSchema,
  numberFilterSchema,
]);

const sortSchema = z.object({
  columnId: z.string(),
  columnType: z.enum(["text", "number"]),
  direction: z.enum(["asc", "desc"]),
});

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
        filters: z.array(filterSchema).optional(),
        sorts: z.array(sortSchema).optional(),
        searchTerm: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.view.update({
        where: { id: input.viewId },
        data: {
          columnOrder: input.columnOrder,
          hiddenColumns: input.hiddenColumnIds,
          filters: input.filters,
          sorts: input.sorts,
          searchTerm: input.searchTerm,
        },
      });
    }),  
});
