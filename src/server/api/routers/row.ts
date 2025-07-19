import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const rowRouter = createTRPCRouter({
  getByTable: publicProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.row.findMany({
        where: { tableId: input.tableId },
        include: {
          cells: true,
        },
        orderBy: { createdAt: "asc" },
      });
    }),
});
