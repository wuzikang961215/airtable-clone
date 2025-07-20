import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
          isDeleted: false, // ✅ only fetch active rows
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
});
