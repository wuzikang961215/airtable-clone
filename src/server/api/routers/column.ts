import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const columnRouter = createTRPCRouter({
  getByTable: publicProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.column.findMany({
        where: {
          tableId: input.tableId,
          isDeleted: false, // ✅ only fetch active columns
        },
        orderBy: { order: "asc" },
      });
    }),
});
