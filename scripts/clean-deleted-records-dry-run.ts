import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function analyzeDeletedRecords() {
  console.log("Analyzing soft-deleted records (DRY RUN)...\n");

  try {
    // Count deleted Bases
    const deletedBases = await prisma.base.count({
      where: { isDeleted: true },
    });
    console.log(`📊 Found ${deletedBases} soft-deleted bases`);

    // Count deleted Tables
    const deletedTables = await prisma.table.count({
      where: { isDeleted: true },
    });
    console.log(`📊 Found ${deletedTables} soft-deleted tables`);

    // Count deleted Columns
    const deletedColumns = await prisma.column.count({
      where: { isDeleted: true },
    });
    console.log(`📊 Found ${deletedColumns} soft-deleted columns`);

    // Count deleted Rows
    const deletedRows = await prisma.row.count({
      where: { isDeleted: true },
    });
    console.log(`📊 Found ${deletedRows} soft-deleted rows`);

    // Count orphaned Cells
    const orphanedCells = await prisma.cell.count({
      where: {
        OR: [
          { row: { isDeleted: true } },
          { column: { isDeleted: true } },
        ],
      },
    });
    console.log(`📊 Found ${orphanedCells} orphaned cells`);

    // Count orphaned Views
    const orphanedViews = await prisma.view.count({
      where: {
        table: { isDeleted: true },
      },
    });
    console.log(`📊 Found ${orphanedViews} orphaned views`);

    // Show summary
    const totalToDelete = 
      deletedBases + 
      deletedTables + 
      deletedColumns + 
      deletedRows + 
      orphanedCells + 
      orphanedViews;
    
    console.log(`\n📊 Total records that would be deleted: ${totalToDelete}`);

    // Show some sample data
    if (deletedBases > 0) {
      const sampleBases = await prisma.base.findMany({
        where: { isDeleted: true },
        take: 3,
        select: { id: true, name: true, createdAt: true },
      });
      console.log("\nSample deleted bases:", sampleBases);
    }

    if (deletedTables > 0) {
      const sampleTables = await prisma.table.findMany({
        where: { isDeleted: true },
        take: 3,
        select: { id: true, name: true, baseId: true, createdAt: true },
      });
      console.log("\nSample deleted tables:", sampleTables);
    }

  } catch (error) {
    console.error("❌ Error during analysis:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDeletedRecords().catch((e) => {
  console.error(e);
  process.exit(1);
});