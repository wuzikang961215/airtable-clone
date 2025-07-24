/*
  Warnings:

  - You are about to drop the column `flattenedValues` on the `Row` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Cell" ADD COLUMN     "flattenedValueNumber" DOUBLE PRECISION,
ADD COLUMN     "flattenedValueText" TEXT;

-- AlterTable
ALTER TABLE "Row" DROP COLUMN "flattenedValues";

-- CreateIndex
CREATE INDEX "Cell_flattenedValueText_idx" ON "Cell"("flattenedValueText");

-- CreateIndex
CREATE INDEX "Cell_flattenedValueNumber_idx" ON "Cell"("flattenedValueNumber");
