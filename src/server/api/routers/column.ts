import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

// Store column addition progress
const columnAddProgress = new Map<string, { current: number; total: number; columnName: string }>();

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

      // Create the column first
      const newColumn = await ctx.prisma.column.create({
        data: {
          tableId: input.tableId,
          name: input.name,
          type: input.type,
          order: currentCount,
        },
      });

      // Get total row count
      const totalRows = await ctx.prisma.row.count({
        where: { tableId: input.tableId, isDeleted: false },
      });

      // Only create cells if there are rows
      if (totalRows > 0) {
        const progressId = `${input.tableId}-${newColumn.id}`;
        columnAddProgress.set(progressId, { current: 0, total: totalRows, columnName: input.name });
        
        const isNumber = newColumn.type === "number";
        const batchSize = 1000; // Process 1000 rows at a time
        const totalBatches = Math.ceil(totalRows / batchSize);
        
        console.log(`Adding column "${input.name}" to ${totalRows} rows in ${totalBatches} batches`);

        try {
          // Process rows in batches to avoid memory issues
          for (let batch = 0; batch < totalBatches; batch++) {
            const skip = batch * batchSize;
            
            // Fetch a batch of row IDs
            const rowBatch = await ctx.prisma.row.findMany({
              where: { tableId: input.tableId, isDeleted: false },
              select: { id: true },
              skip,
              take: batchSize,
            });

            // Create cells for this batch
            if (rowBatch.length > 0) {
              await ctx.prisma.cell.createMany({
                data: rowBatch.map((row) => ({
                  rowId: row.id,
                  columnId: newColumn.id,
                  value: "",
                  flattenedValueText: !isNumber ? "" : null,
                  flattenedValueNumber: isNumber ? null : null,
                })),
                skipDuplicates: true,
              });
              
              // Update progress
              const currentProgress = Math.min((batch + 1) * batchSize, totalRows);
              columnAddProgress.set(progressId, { 
                current: currentProgress, 
                total: totalRows, 
                columnName: input.name 
              });
              
              console.log(`Batch ${batch + 1}/${totalBatches} completed (${rowBatch.length} cells created)`);
            }
          }
          
          // Keep progress for a short time to show completion
          setTimeout(() => {
            columnAddProgress.delete(progressId);
          }, 5000);
        } catch (error) {
          // Clean up progress on error
          columnAddProgress.delete(progressId);
          throw error;
        }
      }

      // Update all views' columnOrder
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

  getColumnAddProgress: publicProcedure
    .input(z.object({ tableId: z.string() }))
    .query(({ input }) => {
      // Find progress for this table
      for (const [id, progress] of columnAddProgress) {
        if (id.startsWith(input.tableId)) {
          return progress;
        }
      }
      return null;
    }),

});
