import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function analyzeSoftDeleted() {
  try {
    console.log("\n=== Analyzing Soft-Deleted Records ===\n");

    // Count soft-deleted bases
    const deletedBases = await prisma.base.count({ where: { isDeleted: true } });
    const totalBases = await prisma.base.count();
    
    // Count soft-deleted tables
    const deletedTables = await prisma.table.count({ where: { isDeleted: true } });
    const totalTables = await prisma.table.count();
    
    // Count soft-deleted columns
    const deletedColumns = await prisma.column.count({ where: { isDeleted: true } });
    const totalColumns = await prisma.column.count();
    
    // Count soft-deleted rows
    const deletedRows = await prisma.row.count({ where: { isDeleted: true } });
    const totalRows = await prisma.row.count();
    
    // Count cells associated with deleted rows
    const deletedRowIds = await prisma.row.findMany({
      where: { isDeleted: true },
      select: { id: true }
    });
    const deletedRowIdList = deletedRowIds.map(r => r.id);
    
    // Count cells in batches to avoid memory issues
    let cellsFromDeletedRows = 0;
    const batchSize = 1000;
    for (let i = 0; i < deletedRowIdList.length; i += batchSize) {
      const batch = deletedRowIdList.slice(i, i + batchSize);
      const count = await prisma.cell.count({
        where: { rowId: { in: batch } }
      });
      cellsFromDeletedRows += count;
    }
    
    // Count orphaned cells (from deleted columns)
    const activeColumnIds = await prisma.column.findMany({
      where: { isDeleted: false },
      select: { id: true }
    });
    const activeColumnIdSet = new Set(activeColumnIds.map(c => c.id));
    
    // Get a sample of cells to check for orphans
    const sampleCells = await prisma.cell.findMany({
      take: 1000,
      select: { columnId: true }
    });
    
    const orphanedCellSample = sampleCells.filter(c => !activeColumnIdSet.has(c.columnId));
    const orphanRate = orphanedCellSample.length / sampleCells.length;
    const totalCells = await prisma.cell.count();
    const estimatedOrphanedCells = Math.round(totalCells * orphanRate);
    
    // Views don't have soft delete
    
    console.log("=== Soft-Deleted Records Summary ===");
    console.log(`\nBases: ${deletedBases} deleted out of ${totalBases} total (${((deletedBases/totalBases)*100).toFixed(1)}%)`);
    console.log(`Tables: ${deletedTables} deleted out of ${totalTables} total (${((deletedTables/totalTables)*100).toFixed(1)}%)`);
    console.log(`Columns: ${deletedColumns} deleted out of ${totalColumns} total (${((deletedColumns/totalColumns)*100).toFixed(1)}%)`);
    console.log(`Rows: ${deletedRows.toLocaleString()} deleted out of ${totalRows.toLocaleString()} total (${((deletedRows/totalRows)*100).toFixed(1)}%)`);
    
    console.log("\n=== Storage Impact ===");
    console.log(`Cells from deleted rows: ${cellsFromDeletedRows.toLocaleString()}`);
    console.log(`Estimated orphaned cells: ${estimatedOrphanedCells.toLocaleString()}`);
    
    const totalReclaimable = deletedRows + cellsFromDeletedRows;
    console.log(`\nTotal reclaimable records: ${totalReclaimable.toLocaleString()}`);
    
    // Estimate storage size (rough estimates)
    const avgRowSize = 100; // bytes
    const avgCellSize = 50; // bytes
    const estimatedStorageMB = ((deletedRows * avgRowSize + cellsFromDeletedRows * avgCellSize) / 1024 / 1024).toFixed(2);
    console.log(`Estimated storage to reclaim: ~${estimatedStorageMB} MB`);
    
    // Check for cascading deletes needed
    console.log("\n=== Cascading Deletes Required ===");
    
    // Tables in deleted bases
    const tablesInDeletedBases = await prisma.table.count({
      where: {
        base: { isDeleted: true },
        isDeleted: false
      }
    });
    
    // Rows in deleted tables
    const rowsInDeletedTables = await prisma.row.count({
      where: {
        table: { isDeleted: true },
        isDeleted: false
      }
    });
    
    // Views in deleted tables
    const viewsInDeletedTables = await prisma.view.count({
      where: {
        table: { isDeleted: true }
      }
    });
    
    console.log(`Active tables in deleted bases: ${tablesInDeletedBases}`);
    console.log(`Active rows in deleted tables: ${rowsInDeletedTables.toLocaleString()}`);
    console.log(`Active views in deleted tables: ${viewsInDeletedTables}`);
    
  } catch (error) {
    console.error("Error analyzing soft-deleted records:", error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeSoftDeleted();