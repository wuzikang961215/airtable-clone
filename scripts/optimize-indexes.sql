-- Performance optimization indexes for filtered views
-- Run this script to improve query performance for large tables

-- 1. Composite indexes for efficient JOIN operations
-- These help when joining Row and Cell tables with specific columns
CREATE INDEX IF NOT EXISTS idx_cell_rowid_columnid_text 
  ON "Cell"("rowId", "columnId", "flattenedValueText");

CREATE INDEX IF NOT EXISTS idx_cell_rowid_columnid_number 
  ON "Cell"("rowId", "columnId", "flattenedValueNumber");

-- 2. Index for efficient row filtering by table
-- Helps with the common WHERE tableId = X AND isDeleted = false pattern
CREATE INDEX IF NOT EXISTS idx_row_tableid_isdeleted 
  ON "Row"("tableId", "isDeleted");

-- 3. Trigram index for ILIKE queries (requires pg_trgm extension)
-- This significantly speeds up "contains" text searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_cell_text_trgm 
  ON "Cell" USING gin("flattenedValueText" gin_trgm_ops);

-- 4. Partial indexes for non-deleted rows (most common case)
-- These are smaller and faster for typical queries
CREATE INDEX IF NOT EXISTS idx_row_tableid_active 
  ON "Row"("tableId") 
  WHERE "isDeleted" = false;

-- 5. Covering index for cell lookups
-- Includes all needed columns to avoid table lookups
CREATE INDEX IF NOT EXISTS idx_cell_covering 
  ON "Cell"("rowId", "columnId") 
  INCLUDE ("value", "flattenedValueText", "flattenedValueNumber");

-- Analyze tables to update statistics
ANALYZE "Row";
ANALYZE "Cell";
ANALYZE "Column";

-- Check index usage (run this query after some time to see which indexes are being used)
/*
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
*/