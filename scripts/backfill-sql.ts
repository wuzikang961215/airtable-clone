import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillFlattenedValuesSQL() {
  try {
    console.log('Starting efficient SQL backfill of flattened values...');
    
    // First, update text columns
    console.log('Updating text columns...');
    const textResult = await prisma.$executeRaw`
      UPDATE "Cell"
      SET 
        "flattenedValueText" = "value",
        "flattenedValueNumber" = NULL
      FROM "Column"
      WHERE "Cell"."columnId" = "Column"."id" 
        AND "Column"."type" = 'text';
    `;
    console.log(`Updated ${textResult} text cells`);
    
    // Update number columns using a safer approach - process in smaller batches
    console.log('Getting number cells to update...');
    const numberCells = await prisma.cell.findMany({
      include: { column: true },
      where: { 
        column: { type: 'number' },
        flattenedValueNumber: null
      }
    });
    
    console.log(`Processing ${numberCells.length} number cells...`);
    let numberUpdated = 0;
    
    for (const cell of numberCells) {
      try {
        const numValue = parseFloat(cell.value);
        const flattenedValue = !isNaN(numValue) ? numValue : null;
        
        await prisma.cell.update({
          where: { id: cell.id },
          data: { 
            flattenedValueText: null,
            flattenedValueNumber: flattenedValue 
          }
        });
        numberUpdated++;
        
        if (numberUpdated % 1000 === 0) {
          console.log(`Processed ${numberUpdated}/${numberCells.length} number cells`);
        }
      } catch (error) {
        console.log(`Skipping cell ${cell.id} with invalid value: ${cell.value}`);
        await prisma.cell.update({
          where: { id: cell.id },
          data: { 
            flattenedValueText: null,
            flattenedValueNumber: null 
          }
        });
        numberUpdated++;
      }
    }
    
    console.log(`✅ Successfully backfilled ${textResult + numberUpdated} cells with flattened values`);
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillFlattenedValuesSQL();