import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

export const columnRouter = createTRPCRouter({
  getByTable: publicProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.column.findMany({
        where: {
          tableId: input.tableId,
          isDeleted: false,
        },
        orderBy: { order: "asc" },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ columnId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.column.update({
        where: { id: input.columnId },
        data: { isDeleted: true },
      });
    }),

  add: protectedProcedure
    .input(z.object({
      tableId: z.string(),
      name: z.string().min(1),
      type: z.enum(["text", "number"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentCount = await ctx.prisma.column.count({
        where: { tableId: input.tableId, isDeleted: false },
      });

      return await ctx.prisma.column.create({
        data: {
          tableId: input.tableId,
          name: input.name,
          type: input.type,
          order: currentCount,
        },
      });
    }),
});
