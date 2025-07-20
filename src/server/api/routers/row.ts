import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

export const rowRouter = createTRPCRouter({
  getByTable: publicProcedure
    .input(
      z.object({
        tableId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tableId, limit, cursor } = input;

      const rows = await ctx.prisma.row.findMany({
        where: {
          tableId,
          isDeleted: false,
        },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "asc" },
        include: {
          cells: {
            include: {
              column: true,
            },
          },
        },
      });

      const hasNextPage = rows.length > limit;
      const items = hasNextPage ? rows.slice(0, -1) : rows;

      return {
        rows: items,
        nextCursor: hasNextPage ? items[items.length - 1]!.id : null,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ rowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.row.update({
        where: { id: input.rowId },
        data: { isDeleted: true },
      });
    }),

  add: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const columns = await ctx.prisma.column.findMany({
        where: {
          tableId: input.tableId,
          isDeleted: false,
        },
      });

      const row = await ctx.prisma.row.create({
        data: { tableId: input.tableId },
      });

      await ctx.prisma.$transaction(
        columns.map((col) =>
          ctx.prisma.cell.create({
            data: {
              rowId: row.id,
              columnId: col.id,
              value: "", // default to empty
            },
          })
        )
      );

      return row;
    }),
});
