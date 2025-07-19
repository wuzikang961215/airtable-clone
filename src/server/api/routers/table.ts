import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";

export const tableRouter = createTRPCRouter({
  getByBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.table.findMany({
        where: { baseId: input.baseId },
        include: {
          columns: true,
          rows: {
            include: {
              cells: {
                include: {
                  column: true,
                },
              },
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(z.object({ baseId: z.string(), name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.table.create({
        data: {
          name: input.name,
          baseId: input.baseId,
        },
      });
    }),
});
