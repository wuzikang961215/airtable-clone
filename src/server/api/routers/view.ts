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
});
