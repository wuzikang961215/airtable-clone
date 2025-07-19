import { z } from "zod";
import { faker } from "@faker-js/faker";
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
      // 1. Create the table
      const table = await ctx.prisma.table.create({
        data: {
          name: input.name,
          baseId: input.baseId,
        },
      });

      // 2. Create 3 default columns
      const columns = await ctx.prisma.$transaction([
        ctx.prisma.column.create({
          data: {
            tableId: table.id,
            name: "Name",
            type: "text",
            order: 0,
          },
        }),
        ctx.prisma.column.create({
          data: {
            tableId: table.id,
            name: "Age",
            type: "number",
            order: 1,
          },
        }),
        ctx.prisma.column.create({
          data: {
            tableId: table.id,
            name: "Country",
            type: "text",
            order: 2,
          },
        }),
      ]);

      // 3. Create 100 rows
      const rows = await ctx.prisma.$transaction(
        Array.from({ length: 100 }).map(() =>
          ctx.prisma.row.create({
            data: {
              tableId: table.id,
            },
          }),
        )
      );

      // 4. Create cells for each row/column combo
      const cellPromises = rows.flatMap((row) =>
        columns.map((column) =>
          ctx.prisma.cell.create({
            data: {
              rowId: row.id,
              columnId: column.id,
              value:
                column.name === "Name"
                  ? faker.person.fullName()
                  : column.name === "Age"
                  ? String(faker.number.int({ min: 18, max: 65 }))
                  : faker.location.country(),
            },
          })
        )
      );

      await ctx.prisma.$transaction(cellPromises);

      return table;
    }),
});
