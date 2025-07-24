// server/api/routers/cell.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const cellRouter = createTRPCRouter({
  backfillFlattenedValues: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Get all cells with their column types
      const cellsWithColumns = await ctx.prisma.cell.findMany({
        include: {
          column: {
            select: { type: true }
          }
        }
      });

      console.log(`Found ${cellsWithColumns.length} cells to backfill`);

      // Process in batches to avoid memory issues
      const batchSize = 1000;
      let processed = 0;

      for (let i = 0; i < cellsWithColumns.length; i += batchSize) {
        const batch = cellsWithColumns.slice(i, i + batchSize);
        
        // Update each cell in the batch
        await ctx.prisma.$transaction(
          batch.map(cell => {
            const isNumber = cell.column.type === "number";
            const flattenedValueText = !isNumber ? cell.value : null;
            const flattenedValueNumber = isNumber ? parseFloat(cell.value) || null : null;
            
            return ctx.prisma.cell.update({
              where: { id: cell.id },
              data: {
                flattenedValueText,
                flattenedValueNumber,
              }
            });
          })
        );

        processed += batch.length;
        console.log(`Processed ${processed}/${cellsWithColumns.length} cells`);
      }

      return { 
        success: true, 
        processedCells: processed,
        message: `Successfully backfilled ${processed} cells with flattened values`
      };
    }),

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

      // Get column type to determine how to populate flattened fields
      const column = await ctx.prisma.column.findUnique({
        where: { id: columnId },
        select: { type: true },
      });

      if (!column) {
        throw new Error("Column not found");
      }

      const isNumber = column.type === "number";

      const updated = await ctx.prisma.cell.updateMany({
        where: { rowId, columnId },
        data: {
          value,
          flattenedValueText: !isNumber ? value : null,
          flattenedValueNumber: isNumber ? (value.trim() === "" ? null : parseFloat(value) || null) : null,
        },
      });

      return updated;
    }),
});
