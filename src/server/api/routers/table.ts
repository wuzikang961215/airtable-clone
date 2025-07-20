import { z } from "zod";
import { faker } from "@faker-js/faker";
import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";

export const tableRouter = createTRPCRouter({
  getByBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.table.findMany({
        where: { baseId: input.baseId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: {
            select: { columns: true, rows: true }, // optional summary
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
      const cellData = rows.flatMap((row) => [
        {
          rowId: row.id,
          columnId: nameCol.id,
          value: faker.person.fullName(),
        },
        {
          rowId: row.id,
          columnId: ageCol.id,
          value: String(faker.number.int({ min: 18, max: 65 })),
        },
        {
          rowId: row.id,
          columnId: countryCol.id,
          value: faker.location.country(),
        },
      ]);
  
      await ctx.prisma.cell.createMany({ data: cellData });
  
      return table;
    }),  
});
