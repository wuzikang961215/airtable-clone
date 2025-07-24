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
    .input(
      z.object({
        tableId: z.string(),
        name: z.string().min(1),
        type: z.enum(["text", "number"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentCount = await ctx.prisma.column.count({
        where: { tableId: input.tableId, isDeleted: false },
      });

      const [newColumn, existingRows] = await Promise.all([
        ctx.prisma.column.create({
          data: {
            tableId: input.tableId,
            name: input.name,
            type: input.type,
            order: currentCount,
          },
        }),
        ctx.prisma.row.findMany({
          where: { tableId: input.tableId, isDeleted: false },
          select: { id: true },
        }),
      ]);

      if (existingRows.length > 0) {
        const isNumber = newColumn.type === "number";
        await ctx.prisma.cell.createMany({
          data: existingRows.map((row) => ({
            rowId: row.id,
            columnId: newColumn.id,
            value: "",
            flattenedValueText: !isNumber ? "" : null,
            flattenedValueNumber: isNumber ? null : null,
          })),
          skipDuplicates: true,
        });
      }

      // ✅ 更新所有 views 的 columnOrder
      const allViews = await ctx.prisma.view.findMany({
        where: { tableId: input.tableId },
        select: { id: true },
      });

      await Promise.all(
        allViews.map((view) =>
          ctx.prisma.view.update({
            where: { id: view.id },
            data: {
              columnOrder: {
                push: newColumn.id,
              },
            },
          })
        )
      );

      return newColumn;
    }),

});
