import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkRowCounts() {
  try {
    // Get all tables with their row counts
    const tables = await prisma.table.findMany({
      where: { isDeleted: false },
      include: {
        _count: {
          select: { rows: true }
        },
        base: true
      },
      orderBy: {
        rows: {
          _count: 'desc'
        }
      }
    });

    console.log("\n=== Table Row Counts ===\n");
    
    for (const table of tables) {
      console.log(`Table: ${table.name} (Base: ${table.base.name})`);
      console.log(`  Row count: ${table._count.rows.toLocaleString()}`);
      console.log(`  Created: ${table.createdAt.toLocaleString()}`);
      console.log(`  ID: ${table.id}\n`);
    }

    // Check for tables with more than 50k rows
    const largeTables = tables.filter(t => t._count.rows > 50000);
    if (largeTables.length > 0) {
      console.log(`\n=== Large Tables (>50k rows) ===`);
      console.log(`Found ${largeTables.length} table(s) with more than 50k rows\n`);
      
      // For large tables, check creation time of rows
      for (const table of largeTables) {
        const oldestRow = await prisma.row.findFirst({
          where: { tableId: table.id },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        });
        
        const newestRow = await prisma.row.findFirst({
          where: { tableId: table.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        });
        
        if (oldestRow && newestRow) {
          const timeSpan = newestRow.createdAt.getTime() - oldestRow.createdAt.getTime();
          const seconds = timeSpan / 1000;
          const minutes = seconds / 60;
          
          console.log(`Table: ${table.name}`);
          console.log(`  First row: ${oldestRow.createdAt.toLocaleString()}`);
          console.log(`  Last row: ${newestRow.createdAt.toLocaleString()}`);
          console.log(`  Time span: ${minutes.toFixed(2)} minutes (${seconds.toFixed(0)} seconds)`);
          console.log(`  Insertion rate: ~${(table._count.rows / seconds).toFixed(0)} rows/second\n`);
        }
      }
    }

    // Get total stats
    const totalRows = await prisma.row.count({ where: { isDeleted: false } });
    const totalCells = await prisma.cell.count();
    
    console.log("\n=== Database Statistics ===");
    console.log(`Total rows: ${totalRows.toLocaleString()}`);
    console.log(`Total cells: ${totalCells.toLocaleString()}`);
    console.log(`Average cells per row: ${totalRows > 0 ? (totalCells / totalRows).toFixed(2) : 0}`);
    
  } catch (error) {
    console.error("Error checking row counts:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRowCounts();