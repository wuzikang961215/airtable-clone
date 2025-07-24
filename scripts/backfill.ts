import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillFlattenedValues() {
  try {
    console.log('Starting backfill of flattened values...');
    
    // Get all cells with their column types
    const cellsWithColumns = await prisma.cell.findMany({
      include: {
        column: {
          select: { type: true }
        }
      }
    });

    console.log(`Found ${cellsWithColumns.length} cells to backfill`);

    if (cellsWithColumns.length === 0) {
      console.log('No cells found to backfill');
      return;
    }

    // Process in batches to avoid memory issues
    const batchSize = 100; // Smaller batch size for safety
    let processed = 0;

    for (let i = 0; i < cellsWithColumns.length; i += batchSize) {
      const batch = cellsWithColumns.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(cellsWithColumns.length / batchSize)}`);
      
      // Update each cell in the batch
      for (const cell of batch) {
        const isNumber = cell.column.type === "number";
        const flattenedValueText = !isNumber ? cell.value : null;
        const flattenedValueNumber = isNumber ? (parseFloat(cell.value) || null) : null;
        
        await prisma.cell.update({
          where: { id: cell.id },
          data: {
            flattenedValueText,
            flattenedValueNumber,
          }
        });
        
        processed++;
      }

      console.log(`Processed ${processed}/${cellsWithColumns.length} cells`);
    }

    console.log(`✅ Successfully backfilled ${processed} cells with flattened values`);
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillFlattenedValues();