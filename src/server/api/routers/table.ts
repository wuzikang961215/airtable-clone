import { z } from "zod";
import { faker } from "@faker-js/faker";
import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";

export const tableRouter = createTRPCRouter({
  getByBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.table.findMany({
        where: {
          baseId: input.baseId,
          isDeleted: false, // 👈 Add this
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          views: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { columns: true, rows: true },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(z.object({ baseId: z.string(), name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Create the table
      const table = await ctx.prisma.table.create({
        data: {
          name: input.name,
          baseId: input.baseId,
        },
      });

      // 2. Create 3 columns
      const [nameCol, ageCol, countryCol] = await ctx.prisma.$transaction([
        ctx.prisma.column.create({
          data: { tableId: table.id, name: "Name", type: "text", order: 0 },
        }),
        ctx.prisma.column.create({
          data: { tableId: table.id, name: "Age", type: "number", order: 1 },
        }),
        ctx.prisma.column.create({
          data: { tableId: table.id, name: "Country", type: "text", order: 2 },
        }),
      ]);

      // 3. Bulk insert rows
      const rowData = Array.from({ length: 100 }).map(() => ({
        tableId: table.id,
      }));
      await ctx.prisma.row.createMany({ data: rowData });

      const rows = await ctx.prisma.row.findMany({
        where: { tableId: table.id },
        select: { id: true },
      });

      // 4. Bulk insert cells
      const cellData = rows.flatMap((row) => {
        const nameValue = faker.person.fullName();
        const ageValue = String(faker.number.int({ min: 18, max: 65 }));
        const countryValue = faker.location.country();
        
        return [
          {
            rowId: row.id,
            columnId: nameCol.id,
            value: nameValue,
            flattenedValueText: nameValue,
            flattenedValueNumber: null,
          },
          {
            rowId: row.id,
            columnId: ageCol.id,
            value: ageValue,
            flattenedValueText: null,
            flattenedValueNumber: parseFloat(ageValue),
          },
          {
            rowId: row.id,
            columnId: countryCol.id,
            value: countryValue,
            flattenedValueText: countryValue,
            flattenedValueNumber: null,
          },
        ];
      });

      await ctx.prisma.cell.createMany({ data: cellData });

      // ✅ 5. Create default view
      await ctx.prisma.view.create({
        data: {
          tableId: table.id,
          name: "Default View",
          columnOrder: [nameCol.id, ageCol.id, countryCol.id],
          filters: [],
          sorts: [],
          hiddenColumns: [],
        },
      });

      return table;
    }),

  delete: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.table.update({
        where: {
          id: input.tableId,
          // 可选：限制只能删除自己 Base 下的表
          // base: { userId: ctx.session.user.id }
        },
        data: {
          isDeleted: true,
        },
      });
    }),
});
