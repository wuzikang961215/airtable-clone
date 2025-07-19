import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";

export const baseRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    console.log("session", ctx.session);
    console.log("user.id", ctx.session?.user?.id);
    return ctx.prisma.base.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.base.create({
        data: {
          name: input.name,
          userId: ctx.session.user.id,
        },
      });
    }),
});
