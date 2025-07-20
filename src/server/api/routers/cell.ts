// server/api/routers/cell.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const cellRouter = createTRPCRouter({
  update: protectedProcedure
    .input(
      z.object({
        rowId: z.string(),
        columnId: z.string(),
        value: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { rowId, columnId, value } = input;

      const updated = await ctx.prisma.cell.updateMany({
        where: { rowId, columnId },
        data: { value },
      });

      return updated;
    }),
});
