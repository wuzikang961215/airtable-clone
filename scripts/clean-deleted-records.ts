import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanDeletedRecords() {
  console.log("Starting cleanup of soft-deleted records...\n");

  try {
    // IMPORTANT: Delete in reverse order of dependencies to avoid foreign key violations
    
    // Step 1: Delete all cells that belong to deleted rows or columns
    const orphanedCells = await prisma.cell.deleteMany({
      where: {
        OR: [
          { row: { isDeleted: true } },
          { column: { isDeleted: true } },
          { row: { table: { isDeleted: true } } },
          { column: { table: { isDeleted: true } } },
        ],
      },
    });
    console.log(`✓ Deleted ${orphanedCells.count} orphaned cells`);

    // Step 2: Delete all views that belong to deleted tables
    const orphanedViews = await prisma.view.deleteMany({
      where: {
        table: { isDeleted: true },
      },
    });
    console.log(`✓ Deleted ${orphanedViews.count} orphaned views`);

    // Step 3: Delete rows that are marked as deleted
    const deletedRows = await prisma.row.deleteMany({
      where: { isDeleted: true },
    });
    console.log(`✓ Deleted ${deletedRows.count} soft-deleted rows`);

    // Step 4: Delete rows that belong to deleted tables
    const orphanedRows = await prisma.row.deleteMany({
      where: {
        table: { isDeleted: true },
      },
    });
    console.log(`✓ Deleted ${orphanedRows.count} orphaned rows (from deleted tables)`);

    // Step 5: Delete columns that are marked as deleted
    const deletedColumns = await prisma.column.deleteMany({
      where: { isDeleted: true },
    });
    console.log(`✓ Deleted ${deletedColumns.count} soft-deleted columns`);

    // Step 6: Delete columns that belong to deleted tables
    const orphanedColumns = await prisma.column.deleteMany({
      where: {
        table: { isDeleted: true },
      },
    });
    console.log(`✓ Deleted ${orphanedColumns.count} orphaned columns (from deleted tables)`);

    // Step 7: Delete tables that are marked as deleted
    const deletedTables = await prisma.table.deleteMany({
      where: { isDeleted: true },
    });
    console.log(`✓ Deleted ${deletedTables.count} soft-deleted tables`);

    // Step 7b: Delete tables that belong to deleted bases
    const orphanedTables = await prisma.table.deleteMany({
      where: {
        base: { isDeleted: true },
      },
    });
    console.log(`✓ Deleted ${orphanedTables.count} orphaned tables (from deleted bases)`);

    // Step 8: Delete bases that are marked as deleted
    const deletedBases = await prisma.base.deleteMany({
      where: { isDeleted: true },
    });
    console.log(`✓ Deleted ${deletedBases.count} soft-deleted bases`);

    console.log("\n✅ Cleanup completed successfully!");

    // Show summary
    const totalDeleted = 
      deletedBases.count + 
      deletedTables.count + 
      deletedColumns.count + 
      deletedRows.count + 
      orphanedCells.count + 
      orphanedViews.count +
      orphanedRows.count +
      orphanedColumns.count +
      orphanedTables.count;
    
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