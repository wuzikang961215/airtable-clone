import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";

export const baseRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.base.findMany({
      where: {
        userId: ctx.session.user.id,
        isDeleted: false, // 👈 Add this line
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: protectedProcedure // ✅ 新增部分
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.base.findUnique({
        where: { id: input.baseId },
        select: {
          id: true,
          name: true,
        },
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

  delete: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.base.update({
        where: {
          id: input.baseId,
          userId: ctx.session.user.id, // optional: extra security
        },
        data: {
          isDeleted: true,
        },
      });
    }),
});
