import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupSoftDeleted() {
  console.log("\n=== Starting Database Cleanup ===\n");
  console.log("⚠️  This will permanently delete soft-deleted records and their dependencies.");
  console.log("⚠️  Make sure you have a backup before proceeding!\n");
  
  // Add a delay for safety
  console.log("Starting cleanup in 5 seconds... Press Ctrl+C to cancel");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    // Start transaction for safety
    await prisma.$transaction(async (tx) => {
      let totalDeleted = 0;
      
      // Step 1: Delete cells from rows in deleted tables
      console.log("\n1. Deleting cells from rows in deleted tables...");
      const deletedTableIds = await tx.table.findMany({
        where: { isDeleted: true },
        select: { id: true }
      });
      
      const deletedTableIdList = deletedTableIds.map(t => t.id);
      
      // Delete cells in batches to avoid memory issues
      const batchSize = 1000;
      for (const tableId of deletedTableIdList) {
        const rowsInTable = await tx.row.findMany({
          where: { tableId },
          select: { id: true }
        });
        
        const rowIdList = rowsInTable.map(r => r.id);
        
        for (let i = 0; i < rowIdList.length; i += batchSize) {
          const batch = rowIdList.slice(i, i + batchSize);
          const result = await tx.cell.deleteMany({
            where: { rowId: { in: batch } }
          });
          totalDeleted += result.count;
          console.log(`  Deleted ${result.count} cells from batch ${Math.floor(i/batchSize) + 1}`);
        }
      }
      
      // Step 2: Delete cells from soft-deleted rows
      console.log("\n2. Deleting cells from soft-deleted rows...");
      const deletedRows = await tx.row.findMany({
        where: { isDeleted: true },
        select: { id: true }
      });
      
      const deletedRowIdList = deletedRows.map(r => r.id);
      
      for (let i = 0; i < deletedRowIdList.length; i += batchSize) {
        const batch = deletedRowIdList.slice(i, i + batchSize);
        const result = await tx.cell.deleteMany({
          where: { rowId: { in: batch } }
        });
        totalDeleted += result.count;
        if (result.count > 0) {
          console.log(`  Deleted ${result.count} cells from soft-deleted rows`);
        }
      }
      
      // Step 3: Delete rows in deleted tables
      console.log("\n3. Deleting rows in deleted tables...");
      for (const tableId of deletedTableIdList) {
        const result = await tx.row.deleteMany({
          where: { tableId }
        });
        if (result.count > 0) {
          console.log(`  Deleted ${result.count} rows from table ${tableId}`);
          totalDeleted += result.count;
        }
      }
      
      // Step 4: Delete soft-deleted rows
      console.log("\n4. Deleting soft-deleted rows...");
      const deletedRowResult = await tx.row.deleteMany({
        where: { isDeleted: true }
      });
      console.log(`  Deleted ${deletedRowResult.count} soft-deleted rows`);
      totalDeleted += deletedRowResult.count;
      
      // Step 5: Delete views in deleted tables
      console.log("\n5. Deleting views in deleted tables...");
      const viewResult = await tx.view.deleteMany({
        where: { tableId: { in: deletedTableIdList } }
      });
      console.log(`  Deleted ${viewResult.count} views`);
      totalDeleted += viewResult.count;
      
      // Step 6: Delete columns in deleted tables
      console.log("\n6. Deleting columns in deleted tables...");
      const columnResult = await tx.column.deleteMany({
        where: { tableId: { in: deletedTableIdList } }
      });
      console.log(`  Deleted ${columnResult.count} columns`);
      totalDeleted += columnResult.count;
      
      // Step 7: Delete soft-deleted columns
      console.log("\n7. Deleting soft-deleted columns...");
      const deletedColumnResult = await tx.column.deleteMany({
        where: { isDeleted: true }
      });
      console.log(`  Deleted ${deletedColumnResult.count} soft-deleted columns`);
      totalDeleted += deletedColumnResult.count;
      
      // Step 8: Delete soft-deleted tables
      console.log("\n8. Deleting soft-deleted tables...");
      const tableResult = await tx.table.deleteMany({
        where: { isDeleted: true }
      });
      console.log(`  Deleted ${tableResult.count} tables`);
      totalDeleted += tableResult.count;
      
      // Step 9: Delete tables in deleted bases
      console.log("\n9. Deleting tables in deleted bases...");
      const deletedBaseIds = await tx.base.findMany({
        where: { isDeleted: true },
        select: { id: true }
      });
      const deletedBaseIdList = deletedBaseIds.map(b => b.id);
      
      const tablesInDeletedBasesResult = await tx.table.deleteMany({
        where: { baseId: { in: deletedBaseIdList } }
      });
      console.log(`  Deleted ${tablesInDeletedBasesResult.count} tables`);
      totalDeleted += tablesInDeletedBasesResult.count;
      
      // Step 10: Delete soft-deleted bases
      console.log("\n10. Deleting soft-deleted bases...");
      const baseResult = await tx.base.deleteMany({
        where: { isDeleted: true }
      });
      console.log(`  Deleted ${baseResult.count} bases`);
      totalDeleted += baseResult.count;
      
      console.log(`\n✅ Cleanup completed! Total records deleted: ${totalDeleted.toLocaleString()}`);
    }, {
      timeout: 600000 // 10 minute timeout for large cleanups
    });
    
    // Show final stats
    console.log("\n=== Final Database Stats ===");
    const finalRows = await prisma.row.count();
    const finalCells = await prisma.cell.count();
    const finalTables = await prisma.table.count();
    const finalBases = await prisma.base.count();
    
    console.log(`Active bases: ${finalBases}`);
    console.log(`Active tables: ${finalTables}`);
    console.log(`Active rows: ${finalRows.toLocaleString()}`);
    console.log(`Active cells: ${finalCells.toLocaleString()}`);
    
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
    console.error("Transaction rolled back - no changes were made");
  } finally {
    await prisma.$disconnect();
  }
}

// Add safety check for production
if (process.env.NODE_ENV === 'production' && !process.env.FORCE_CLEANUP) {
  console.error("❌ Cannot run cleanup in production without FORCE_CLEANUP=true");
  process.exit(1);
}

cleanupSoftDeleted();