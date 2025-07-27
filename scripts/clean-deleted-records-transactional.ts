import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanDeletedRecords() {
  console.log("Starting cleanup of soft-deleted records...\n");

  try {
    // Use a transaction to ensure all deletions succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      const results = {
        orphanedCells: 0,
        orphanedViews: 0,
        deletedRows: 0,
        orphanedRows: 0,
        deletedColumns: 0,
        orphanedColumns: 0,
        deletedTables: 0,
        orphanedTables: 0,
        deletedBases: 0,
      };

      // Step 1: Get all deleted bases
      const deletedBasesIds = await tx.base.findMany({
        where: { isDeleted: true },
        select: { id: true },
      });
      const deletedBaseIds = deletedBasesIds.map(b => b.id);

      // Step 2: Get all deleted tables (including those in deleted bases)
      const deletedTablesData = await tx.table.findMany({
        where: {
          OR: [
            { isDeleted: true },
            { baseId: { in: deletedBaseIds } },
          ],
        },
        select: { id: true },
      });
      const deletedTableIds = deletedTablesData.map(t => t.id);

      // Step 3: Get all deleted columns (including those in deleted tables)
      const deletedColumnsData = await tx.column.findMany({
        where: {
          OR: [
            { isDeleted: true },
            { tableId: { in: deletedTableIds } },
          ],
        },
        select: { id: true },
      });
      const deletedColumnIds = deletedColumnsData.map(c => c.id);

      // Step 4: Get all deleted rows (including those in deleted tables)
      const deletedRowsData = await tx.row.findMany({
        where: {
          OR: [
            { isDeleted: true },
            { tableId: { in: deletedTableIds } },
          ],
        },
        select: { id: true },
      });
      const deletedRowIds = deletedRowsData.map(r => r.id);

      // Now delete in the correct order
      
      // Delete cells
      if (deletedRowIds.length > 0 || deletedColumnIds.length > 0) {
        const cellResult = await tx.cell.deleteMany({
          where: {
            OR: [
              { rowId: { in: deletedRowIds } },
              { columnId: { in: deletedColumnIds } },
            ],
          },
        });
        results.orphanedCells = cellResult.count;
        console.log(`✓ Deleted ${cellResult.count} orphaned cells`);
      }

      // Delete views
      if (deletedTableIds.length > 0) {
        const viewResult = await tx.view.deleteMany({
          where: { tableId: { in: deletedTableIds } },
        });
        results.orphanedViews = viewResult.count;
        console.log(`✓ Deleted ${viewResult.count} orphaned views`);
      }

      // Delete rows
      if (deletedRowIds.length > 0) {
        const rowResult = await tx.row.deleteMany({
          where: { id: { in: deletedRowIds } },
        });
        results.deletedRows = rowResult.count;
        console.log(`✓ Deleted ${rowResult.count} rows`);
      }

      // Delete columns
      if (deletedColumnIds.length > 0) {
        const columnResult = await tx.column.deleteMany({
          where: { id: { in: deletedColumnIds } },
        });
        results.deletedColumns = columnResult.count;
        console.log(`✓ Deleted ${columnResult.count} columns`);
      }

      // Delete tables
      if (deletedTableIds.length > 0) {
        const tableResult = await tx.table.deleteMany({
          where: { id: { in: deletedTableIds } },
        });
        results.deletedTables = tableResult.count;
        console.log(`✓ Deleted ${tableResult.count} tables`);
      }

      // Delete bases
      if (deletedBaseIds.length > 0) {
        const baseResult = await tx.base.deleteMany({
          where: { id: { in: deletedBaseIds } },
        });
        results.deletedBases = baseResult.count;
        console.log(`✓ Deleted ${baseResult.count} bases`);
      }

      return results;
    }, {
      maxWait: 300000, // 5 minutes
      timeout: 600000, // 10 minutes
    });

    console.log("\n✅ Cleanup completed successfully!");

    // Show summary
    const totalDeleted = Object.values(result).reduce((sum, count) => sum + count, 0);
    console.log(`\nTotal records deleted: ${totalDeleted}`);

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup with confirmation
async function main() {
  console.log("⚠️  WARNING: This will permanently delete all soft-deleted records!");
  console.log("This action cannot be undone.\n");

  // Get confirmation if running interactively
  if (process.stdin.isTTY) {
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      readline.question("Are you sure you want to continue? (yes/no): ", resolve);
    });

    readline.close();

    if (answer.toLowerCase() !== "yes") {
      console.log("\n❌ Cleanup cancelled.");
      process.exit(0);
    }
  }

  await cleanDeletedRecords();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});