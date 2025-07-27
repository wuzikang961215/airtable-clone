import { z } from "zod";
import { faker } from "@faker-js/faker";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

// Enhanced filter types supporting different column types
const textFilterSchema = z.object({
  columnId: z.string(),
  columnType: z.literal("text"),
  operator: z.enum(["contains", "equals", "not_contains", "is_empty", "is_not_empty"]),
  value: z.string().optional(),
});

const numberFilterSchema = z.object({
  columnId: z.string(),
  columnType: z.literal("number"),
  operator: z.enum(["equals", "greater_than", "less_than", "greater_equal", "less_equal", "is_empty", "is_not_empty"]),
  value: z.number().optional(),
});

const filterSchema = z.union([
  textFilterSchema,
  numberFilterSchema,
]);

const sortSchema = z.object({
  columnId: z.string(),
  columnType: z.enum(["text", "number"]),
  direction: z.enum(["asc", "desc"]),
});

type Filter = z.infer<typeof filterSchema>;
type Sort = z.infer<typeof sortSchema>;

// Store bulk insert progress in memory (in production, use Redis or similar)
const bulkInsertProgress = new Map<string, { current: number; total: number; tableId: string }>();


export const rowRouter = createTRPCRouter({
  getByTable: publicProcedure
    .input(
      z.object({
        tableId: z.string(),
        viewId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
        direction: z.enum(["forward", "backward"]).default("forward"),
        filters: z.preprocess(
          (val) => (Array.isArray(val) ? val as Filter[] : []),
          z.array(filterSchema)
        ),
        sorts: z.preprocess(
          (val) => (Array.isArray(val) ? val as Sort[] : []),
          z.array(sortSchema)
        ),
      })
    )
    .query(async ({ ctx, input }) => {
      const { tableId, viewId, limit, cursor, direction } = input;

      // Get view configuration if viewId is provided
      let view = null;
      if (viewId) {
        view = await ctx.prisma.view.findUnique({
          where: { id: viewId },
        });
      }

      // Use input filters/sorts or fall back to view configuration
      const filters = input.filters.length > 0 ? input.filters : (view?.filters as Filter[] ?? []);
      const allSorts = input.sorts.length > 0 ? input.sorts : (view?.sorts as Sort[] ?? []);
      
      // Limit to single sort and single filter for simplicity
      const sorts = allSorts.slice(0, 1);
      const filteredFilters = filters.slice(0, 1);

      // Collect all unique column IDs for JOINs
      const allColumnIds = new Set<string>();
      filteredFilters.forEach(f => allColumnIds.add(f.columnId));
      sorts.forEach(s => allColumnIds.add(s.columnId));
      
      const columnIds = Array.from(allColumnIds);

      // Build WHERE conditions
      const whereConditions: string[] = [];
      const queryParams: unknown[] = [];
      let paramIndex = 1;

      // Add column ID parameters for JOINs first
      columnIds.forEach(columnId => {
        queryParams.push(columnId);
        paramIndex++;
      });

      // Build JOIN clauses with correct parameter positions
      const joinClauses = columnIds.map((columnId, index) => 
        `LEFT JOIN "Cell" c${index + 1} ON r."id" = c${index + 1}."rowId" AND c${index + 1}."columnId" = $${index + 1}`
      );

      // Base conditions
      whereConditions.push(`r."tableId" = $${paramIndex}`);
      queryParams.push(tableId);
      paramIndex++;

      whereConditions.push(`r."isDeleted" = $${paramIndex}`);
      queryParams.push(false);
      paramIndex++;

      // Add filter conditions using JOIN aliases
      for (const filter of filteredFilters) {
        const columnIndex = columnIds.indexOf(filter.columnId);
        const alias = `c${columnIndex + 1}`;
        const fieldName = filter.columnType === "text" ? '"flattenedValueText"' : '"flattenedValueNumber"';
        
        switch (filter.operator) {
          case "contains":
            whereConditions.push(`${alias}.${fieldName} ILIKE $${paramIndex}`);
            queryParams.push(`%${filter.value ?? ""}%`);
            paramIndex++;
            break;
          case "not_contains":
            whereConditions.push(`(${alias}.${fieldName} NOT ILIKE $${paramIndex} OR ${alias}.${fieldName} IS NULL)`);
            queryParams.push(`%${filter.value ?? ""}%`);
            paramIndex++;
            break;
          case "equals":
            whereConditions.push(`${alias}.${fieldName} = $${paramIndex}`);
            queryParams.push(filter.value ?? (filter.columnType === "text" ? "" : 0));
            paramIndex++;
            break;
          case "greater_than":
            whereConditions.push(`${alias}.${fieldName} > $${paramIndex}`);
            queryParams.push(filter.value ?? 0);
            paramIndex++;
            break;
          case "less_than":
            whereConditions.push(`${alias}.${fieldName} < $${paramIndex}`);
            queryParams.push(filter.value ?? 0);
            paramIndex++;
            break;
          case "greater_equal":
            whereConditions.push(`${alias}.${fieldName} >= $${paramIndex}`);
            queryParams.push(filter.value ?? 0);
            paramIndex++;
            break;
          case "less_equal":
            whereConditions.push(`${alias}.${fieldName} <= $${paramIndex}`);
            queryParams.push(filter.value ?? 0);
            paramIndex++;
            break;
          case "is_empty":
            whereConditions.push(`(${alias}.${fieldName} IS NULL OR ${alias}.${fieldName} = ${filter.columnType === "text" ? "''" : "0"})`);
            break;
          case "is_not_empty":
            whereConditions.push(`(${alias}.${fieldName} IS NOT NULL AND ${alias}.${fieldName} != ${filter.columnType === "text" ? "''" : "0"})`);
            break;
        }
      }

      // Search functionality - just for highlighting, don't filter rows
      // The frontend will handle highlighting matching cells

      // Add cursor condition for pagination
      if (cursor?.trim()) {
        if (sorts.length > 0) {
          // Get cursor row values for sorted columns
          const cursorCells = await ctx.prisma.cell.findMany({
            where: { 
              rowId: cursor,
              columnId: { in: sorts.map(s => s.columnId) }
            },
            select: {
              columnId: true,
              flattenedValueText: true,
              flattenedValueNumber: true
            }
          });
          
          // Build cursor condition for the first sort column only (simpler approach)
          const firstSort = sorts[0]!;
          const firstSortCell = cursorCells.find(c => c.columnId === firstSort.columnId);
          const columnIndex = columnIds.indexOf(firstSort.columnId);
          const alias = `c${columnIndex + 1}`;
          const fieldName = firstSort.columnType === "text" ? '"flattenedValueText"' : '"flattenedValueNumber"';
          
          // Direction is always forward since we removed backward pagination
          
          const cursorValue = firstSort.columnType === "text" 
            ? (firstSortCell?.flattenedValueText ?? "")
            : (firstSortCell?.flattenedValueNumber ?? null);
            
          // Check if cursor is on an empty value (NULL for numbers, empty string for text)
          const isCursorEmpty = firstSort.columnType === "text" 
            ? cursorValue === ""
            : cursorValue === null;
            
          if (isCursorEmpty) {
            // Handle NULL cursor values
            const cursorIdParam = `$${paramIndex}`;
            queryParams.push(cursor);
            paramIndex++;
            
            if (firstSort.columnType === "text") {
              // For text columns, empty string is the "empty" value
              if (firstSort.direction === "asc") {
                // ASC: empty strings first, get remaining empties with higher ID or any non-empty
                whereConditions.push(`(${alias}.${fieldName} = '' AND r."id" > ${cursorIdParam}) OR ${alias}.${fieldName} != ''`);
              } else {
                // DESC: empty strings last, only get empties with higher ID
                whereConditions.push(`${alias}.${fieldName} = '' AND r."id" > ${cursorIdParam}`);
              }
            } else {
              // For number columns, NULL is the empty value
              if (firstSort.direction === "asc") {
                // ASC with NULLS FIRST: if cursor is NULL, get remaining NULLs with higher ID or any non-NULL
                whereConditions.push(`(${alias}.${fieldName} IS NULL AND r."id" > ${cursorIdParam}) OR ${alias}.${fieldName} IS NOT NULL`);
              } else {
                // DESC with NULLS LAST: if cursor is NULL, only get NULLs with higher ID
                whereConditions.push(`${alias}.${fieldName} IS NULL AND r."id" > ${cursorIdParam}`);
              }
            }
          } else {
            // Handle non-NULL cursor values
            const cursorValueParam = `$${paramIndex}`;
            queryParams.push(cursorValue);
            paramIndex++;
            
            const cursorIdParam = `$${paramIndex}`;
            queryParams.push(cursor);
            paramIndex++;
            
            // Build proper comparison based on sort direction and column type
            if (firstSort.columnType === "text") {
              if (firstSort.direction === "asc") {
                // ASC: get values greater than cursor OR equal with higher ID
                whereConditions.push(`(${alias}.${fieldName} > ${cursorValueParam} OR (${alias}.${fieldName} = ${cursorValueParam} AND r."id" > ${cursorIdParam}))`);
              } else {
                // DESC: get values less than cursor OR equal with higher ID OR empty strings (which come last)
                whereConditions.push(`(${alias}.${fieldName} < ${cursorValueParam} OR (${alias}.${fieldName} = ${cursorValueParam} AND r."id" > ${cursorIdParam}) OR ${alias}.${fieldName} = '')`);
              }
            } else {
              // Number columns
              if (firstSort.direction === "asc") {
                // ASC: get values greater than cursor OR equal with higher ID
                whereConditions.push(`(${alias}.${fieldName} > ${cursorValueParam} OR (${alias}.${fieldName} = ${cursorValueParam} AND r."id" > ${cursorIdParam}))`);
              } else {
                // DESC: get values less than cursor OR equal with higher ID OR any NULL (since NULLS LAST)
                whereConditions.push(`(${alias}.${fieldName} < ${cursorValueParam} OR (${alias}.${fieldName} = ${cursorValueParam} AND r."id" > ${cursorIdParam}) OR ${alias}.${fieldName} IS NULL)`);
              }
            }
          }
        } else {
          // No sorts - use simple row ID pagination
          const isForward = direction === "forward";
          const operator = isForward ? ">" : "<";
          
          const cursorParam = `$${paramIndex}`;
          queryParams.push(cursor);
          paramIndex++;
          
          whereConditions.push(`r."id" ${operator} ${cursorParam}`);
        }
      }

      // Build ORDER BY clause using JOIN aliases
      let orderByClause = `"r"."id" ASC`; // Changed to use ID for consistent pagination
      if (sorts.length > 0) {
        const sortClauses = sorts.map((sort) => {
          const columnIndex = columnIds.indexOf(sort.columnId);
          const alias = `c${columnIndex + 1}`;
          const fieldName = sort.columnType === "text" ? '"flattenedValueText"' : '"flattenedValueNumber"';
          
          if (sort.columnType === "text") {
            // For text columns, use standard ordering with NULLS positioning
            // Empty strings will naturally sort at the beginning for ASC, end for DESC
            const nullsPosition = sort.direction === "asc" ? "NULLS FIRST" : "NULLS LAST";
            return `${alias}.${fieldName} ${sort.direction.toUpperCase()} ${nullsPosition}`;
          } else {
            // For number columns, use NULLS positioning
            const nullsPosition = sort.direction === "desc" ? "NULLS LAST" : "NULLS FIRST";
            return `${alias}.${fieldName} ${sort.direction.toUpperCase()} ${nullsPosition}`;
          }
        });
        
        orderByClause = sortClauses.join(", ") + `, "r"."id" ASC`;
      }

      // Add limit parameter
      const limitParam = `$${paramIndex}`;
      queryParams.push(limit);
      paramIndex++;

      // Build final query
      const joinClause = joinClauses.length > 0 ? joinClauses.join("\n        ") : "";
      const query = `
        SELECT r."id", r."tableId", r."createdAt", r."isDeleted"
        FROM "Row" r
        ${joinClause}
        WHERE ${whereConditions.join(" AND ")}
        ORDER BY ${orderByClause}
        LIMIT ${limitParam}
      `;

      // Debug logging for troubleshooting missing rows
      console.log("=== ROW QUERY DEBUG ===");
      console.log("Query:", query);
      console.log("Params:", queryParams);
      console.log("Sorts:", sorts);
      console.log("Filters:", filteredFilters);
      console.log("========================");


      // Use $queryRawUnsafe for dynamic queries with parameters
      const rows = await ctx.prisma.$queryRawUnsafe<Array<{
        id: string;
        tableId: string;
        createdAt: Date;
        isDeleted: boolean;
      }>>(query, ...queryParams);

      // Fetch cells for the returned rows
      const rowIds = rows.map((r) => r.id);
      const cells = rowIds.length > 0 ? await ctx.prisma.cell.findMany({
        where: { rowId: { in: rowIds } },
      }) : [];

      // Group cells by row ID
      const cellsByRow: Record<string, typeof cells> = {};
      for (const cell of cells) {
        cellsByRow[cell.rowId] ??= [];
        cellsByRow[cell.rowId]?.push(cell);
      }

      // Combine rows with their cells
      const rowsWithCells = rows.map((row) => ({
        ...row,
        cells: cellsByRow[row.id] ?? [],
      }));

      // Get total count for the same query conditions
      const countQuery = `
        SELECT COUNT(DISTINCT r."id") as count
        FROM "Row" r
        ${joinClause}
        WHERE ${whereConditions.join(" AND ")}
      `;
      
      const countResult = await ctx.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        countQuery,
        ...queryParams.slice(0, -1) // Exclude the limit parameter
      );
      
      const totalCount = Number(countResult[0]?.count ?? 0);

      return {
        rows: rowsWithCells,
        nextCursor: rows.length === limit ? rows[rows.length - 1]?.id ?? null : null,
        nextOffset: rows.length === limit ? rows.length : null,
        totalCount,
      };
    }),


  delete: protectedProcedure
    .input(z.object({ rowId: z.string(), viewId: z.string(), }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.row.update({
        where: { id: input.rowId },
        data: { isDeleted: true },
      });
    }),

  add: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const columns = await ctx.prisma.column.findMany({
        where: {
          tableId: input.tableId,
          isDeleted: false,
        },
      });

      const row = await ctx.prisma.row.create({
        data: { tableId: input.tableId },
      });

      console.log("=== ROW CREATION DEBUG ===");
      console.log("Created row:", row.id);
      console.log("Columns found:", columns.length);
      console.log("========================");

      const cells = await ctx.prisma.$transaction(
        columns.map((col) => {
          const isNumber = col.type === "number";
          console.log(`Creating cell for column ${col.id} (${col.type})`);
          return ctx.prisma.cell.create({
            data: {
              rowId: row.id,
              columnId: col.id,
              value: "",
              flattenedValueText: !isNumber ? "" : null,
              flattenedValueNumber: isNumber ? null : null, // Keep as null for proper empty value handling
            },
          });
        })
      );

      console.log("Created cells:", cells.length);

      return { ...row, cells };
    }),

  bulkCreateRows: protectedProcedure
    .input(z.object({ 
      tableId: z.string(), 
      count: z.number().min(1).max(100000)
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`Starting bulk insert of ${input.count} rows for table ${input.tableId}`);
      
      // Create a unique progress ID for this operation
      const progressId = `${input.tableId}-${Date.now()}`;
      bulkInsertProgress.set(progressId, { current: 0, total: input.count, tableId: input.tableId });
      
      try {
        // Get columns for cell creation
        const columns = await ctx.prisma.column.findMany({
          where: { tableId: input.tableId, isDeleted: false },
          select: { id: true, type: true, name: true }
        });
        
        if (columns.length === 0) {
          throw new Error("Table has no columns");
        }
        
        // Batch insert for performance - larger batches now that we use efficient SQL
        const batchSize = 5000; // Increased from 1000
        const totalBatches = Math.ceil(input.count / batchSize);
        
        for (let batch = 0; batch < totalBatches; batch++) {
        const currentBatchSize = Math.min(batchSize, input.count - (batch * batchSize));
        
        // Use raw SQL for efficient bulk insert with RETURNING to get IDs
        const rowInsertQuery = `
          INSERT INTO "Row" ("id", "tableId", "createdAt", "isDeleted")
          SELECT 
            gen_random_uuid(),
            $1::text,
            NOW(),
            false
          FROM generate_series(1, $2::int)
          RETURNING id
        `;
        
        const createdRows = await ctx.prisma.$queryRawUnsafe<Array<{ id: string }>>(
          rowInsertQuery,
          input.tableId,
          currentBatchSize
        );
        
        // Create cells with sample data for each row/column combination
        const cells = createdRows.flatMap(row => 
          columns.map(col => {
            let value = "";
            let flattenedValueText: string | null = null;
            let flattenedValueNumber: number | null = null;
            
            // Generate sample data based on column name and type
            if (col.type === "text") {
              // Generate text data based on column name
              const colNameLower = col.name.toLowerCase();
              if (colNameLower.includes("name")) {
                value = faker.person.fullName();
              } else if (colNameLower.includes("email")) {
                value = faker.internet.email();
              } else if (colNameLower.includes("country")) {
                value = faker.location.country();
              } else if (colNameLower.includes("city")) {
                value = faker.location.city();
              } else if (colNameLower.includes("company")) {
                value = faker.company.name();
              } else if (colNameLower.includes("job") || colNameLower.includes("title")) {
                value = faker.person.jobTitle();
              } else {
                // Default text: random word
                value = faker.lorem.words(3);
              }
              flattenedValueText = value;
            } else if (col.type === "number") {
              // Generate number data based on column name
              const colNameLower = col.name.toLowerCase();
              if (colNameLower.includes("age")) {
                value = String(faker.number.int({ min: 18, max: 65 }));
              } else if (colNameLower.includes("price") || colNameLower.includes("cost")) {
                value = faker.commerce.price({ min: 10, max: 1000, dec: 2 });
              } else if (colNameLower.includes("quantity") || colNameLower.includes("count")) {
                value = String(faker.number.int({ min: 1, max: 100 }));
              } else if (colNameLower.includes("rating")) {
                value = faker.number.float({ min: 1, max: 5, fractionDigits: 1 }).toString();
              } else {
                // Default number: random between 1-1000
                value = String(faker.number.int({ min: 1, max: 1000 }));
              }
              flattenedValueNumber = parseFloat(value);
            }
            
            return {
              rowId: row.id,
              columnId: col.id,
              value,
              flattenedValueText,
              flattenedValueNumber
            };
          })
        );
        
        // Batch cell creation in chunks of 10k for better performance
        const cellBatchSize = 10000;
        for (let i = 0; i < cells.length; i += cellBatchSize) {
          const cellBatch = cells.slice(i, i + cellBatchSize);
          await ctx.prisma.cell.createMany({ 
            data: cellBatch,
            skipDuplicates: true // In case of any duplicate row/column combinations
          });
        }
        
        // Update progress
        const currentProgress = (batch + 1) * batchSize;
        const actualProgress = Math.min(currentProgress, input.count);
        bulkInsertProgress.set(progressId, { 
          current: actualProgress, 
          total: input.count, 
          tableId: input.tableId 
        });
        console.log(`Progress update: ${actualProgress}/${input.count} (${Math.round((actualProgress/input.count)*100)}%)`);
        
        console.log(`Completed batch ${batch + 1}/${totalBatches} - Progress: ${actualProgress}/${input.count}`);
      }
      
      console.log(`Bulk insert completed: ${input.count} rows created`);
      
      // Mark as complete instead of deleting immediately
      bulkInsertProgress.set(progressId, { 
        current: input.count, 
        total: input.count, 
        tableId: input.tableId 
      });
      
      // Clean up after a delay to allow UI to show completion
      setTimeout(() => {
        bulkInsertProgress.delete(progressId);
      }, 3000);
      
      return { success: true, count: input.count, progressId };
      } catch (error) {
        // Clean up progress on error
        bulkInsertProgress.delete(progressId);
        throw error;
      }
    }),
    
  getBulkInsertProgress: publicProcedure
    .input(z.object({ tableId: z.string() }))
    .query(({ input }) => {
      // Find the most recent progress for this table
      let latestProgress = null;
      let latestTimestamp = 0;
      
      for (const [id, progress] of bulkInsertProgress) {
        if (progress.tableId === input.tableId) {
          // Extract timestamp from progress ID (format: tableId-timestamp)
          const timestamp = parseInt(id.split('-').pop() ?? '0');
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
            latestProgress = progress;
          }
        }
      }
      
      // Don't return completed progress that's older than 10 seconds
      if (latestProgress && 
          latestProgress.current >= latestProgress.total && 
          Date.now() - latestTimestamp > 10000) {
        return null;
      }
      
      return latestProgress;
    }),
});
