import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupSoftDeletedDryRun() {
  console.log("\n=== DRY RUN - Database Cleanup Analysis ===\n");
  console.log("ℹ️  This is a dry run - no data will be deleted\n");
  
  try {
    let totalWouldDelete = 0;
    
    // Step 1: Count cells from rows in deleted tables
    console.log("\n1. Cells from rows in deleted tables:");
    const deletedTableIds = await prisma.table.findMany({
      where: { isDeleted: true },
      select: { id: true, name: true }
    });
    
    let cellsInDeletedTables = 0;
    for (const table of deletedTableIds) {
      const count = await prisma.cell.count({
        where: {
          row: { tableId: table.id }
        }
      });
      if (count > 0) {
        console.log(`  Table "${table.name}": ${count.toLocaleString()} cells`);
        cellsInDeletedTables += count;
      }
    }
    console.log(`  Total: ${cellsInDeletedTables.toLocaleString()} cells`);
    totalWouldDelete += cellsInDeletedTables;
    
    // Step 2: Count cells from soft-deleted rows
    console.log("\n2. Cells from soft-deleted rows:");
    const cellsFromDeletedRows = await prisma.cell.count({
      where: { row: { isDeleted: true } }
    });
    console.log(`  Total: ${cellsFromDeletedRows.toLocaleString()} cells`);
    totalWouldDelete += cellsFromDeletedRows;
    
    // Step 3: Count rows in deleted tables
    console.log("\n3. Rows in deleted tables:");
    let rowsInDeletedTables = 0;
    for (const table of deletedTableIds) {
      const count = await prisma.row.count({
        where: { tableId: table.id }
      });
      if (count > 0) {
        console.log(`  Table "${table.name}": ${count.toLocaleString()} rows`);
        rowsInDeletedTables += count;
      }
    }
    console.log(`  Total: ${rowsInDeletedTables.toLocaleString()} rows`);
    totalWouldDelete += rowsInDeletedTables;
    
    // Step 4: Count soft-deleted rows
    console.log("\n4. Soft-deleted rows:");
    const deletedRows = await prisma.row.count({
      where: { isDeleted: true }
    });
    console.log(`  Total: ${deletedRows.toLocaleString()} rows`);
    totalWouldDelete += deletedRows;
    
    // Step 5: Count views in deleted tables
    console.log("\n5. Views in deleted tables:");
    const viewsInDeletedTables = await prisma.view.count({
      where: { table: { isDeleted: true } }
    });
    console.log(`  Total: ${viewsInDeletedTables} views`);
    totalWouldDelete += viewsInDeletedTables;
    
    // Step 6: Count columns in deleted tables
    console.log("\n6. Columns in deleted tables:");
    const columnsInDeletedTables = await prisma.column.count({
      where: { table: { isDeleted: true } }
    });
    console.log(`  Total: ${columnsInDeletedTables} columns`);
    totalWouldDelete += columnsInDeletedTables;
    
    // Step 7: Count soft-deleted columns
    console.log("\n7. Soft-deleted columns:");
    const deletedColumns = await prisma.column.count({
      where: { isDeleted: true }
    });
    console.log(`  Total: ${deletedColumns} columns`);
    totalWouldDelete += deletedColumns;
    
    // Step 8: Count soft-deleted tables
    console.log("\n8. Soft-deleted tables:");
    const deletedTables = await prisma.table.count({
      where: { isDeleted: true }
    });
    console.log(`  Total: ${deletedTables} tables`);
    totalWouldDelete += deletedTables;
    
    // Step 9: Count tables in deleted bases
    console.log("\n9. Tables in deleted bases:");
    const deletedBases = await prisma.base.findMany({
      where: { isDeleted: true },
      select: { id: true, name: true }
    });
    
    let tablesInDeletedBases = 0;
    for (const base of deletedBases) {
      const count = await prisma.table.count({
        where: { baseId: base.id, isDeleted: false }
      });
      if (count > 0) {
        console.log(`  Base "${base.name}": ${count} tables`);
        tablesInDeletedBases += count;
      }
    }
    console.log(`  Total: ${tablesInDeletedBases} tables`);
    totalWouldDelete += tablesInDeletedBases;
    
    // Step 10: Count soft-deleted bases
    console.log("\n10. Soft-deleted bases:");
    console.log(`  Total: ${deletedBases.length} bases`);
    totalWouldDelete += deletedBases.length;
    
    console.log(`\n=== Summary ===`);
    console.log(`Total records that would be deleted: ${totalWouldDelete.toLocaleString()}`);
    
    // Estimate storage impact
    const estimatedCells = cellsInDeletedTables + cellsFromDeletedRows;
    const estimatedRows = rowsInDeletedTables + deletedRows;
    const avgCellSize = 50; // bytes
    const avgRowSize = 100; // bytes
    const estimatedStorageMB = ((estimatedCells * avgCellSize + estimatedRows * avgRowSize) / 1024 / 1024).toFixed(2);
    
    console.log(`\nEstimated storage to reclaim: ~${estimatedStorageMB} MB`);
    console.log(`\n✅ Dry run complete. Run the actual cleanup script to delete these records.`);
    
  } catch (error) {
    console.error("\n❌ Error during dry run:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupSoftDeletedDryRun();