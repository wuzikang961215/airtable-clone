# Filtered View Performance Analysis

## Problem Summary
- Initial load of filtered view with 100k rows takes 5-7 seconds
- Switching back to filtered view from raw view is instant (cached)
- Scrolling performance is good in both views

## Root Cause Analysis

### 1. Complex Query Structure
The filtered view query uses multiple LEFT JOINs:
```sql
SELECT r."id", r."tableId", r."createdAt", r."isDeleted"
FROM "Row" r
LEFT JOIN "Cell" c1 ON r."id" = c1."rowId" AND c1."columnId" = $1
WHERE r."tableId" = $2
  AND r."isDeleted" = $3
  AND c1."flattenedValueText" ILIKE $4  -- e.g., '%searchterm%'
ORDER BY c1."flattenedValueText" ASC NULLS FIRST, r."id" ASC
LIMIT $5
```

### 2. Performance Bottlenecks
1. **Multiple JOINs**: Each filtered/sorted column adds a LEFT JOIN
2. **ILIKE operator**: Case-insensitive pattern matching is expensive
3. **Large dataset**: 100k rows means potentially millions of cells
4. **Complex WHERE conditions**: Especially with "contains" filters

### 3. Why Caching Helps
- React Query caches results for each unique query key
- Switching views and back reuses cached data
- Pagination works well because it fetches smaller chunks

## Current Indexes
```prisma
@@index([columnId, flattenedValueText])
@@index([columnId, flattenedValueNumber])
@@index([rowId, columnId])
```

These indexes help but don't fully optimize the complex JOIN queries.

## Optimization Strategies

### 1. Add Missing Indexes (Quick Win)
```sql
-- Add composite index for JOIN operations
CREATE INDEX idx_cell_rowid_columnid_text ON "Cell"("rowId", "columnId", "flattenedValueText");
CREATE INDEX idx_cell_rowid_columnid_number ON "Cell"("rowId", "columnId", "flattenedValueNumber");

-- Add index for table filtering
CREATE INDEX idx_row_tableid_isdeleted ON "Row"("tableId", "isDeleted");
```

### 2. Use Materialized Views (Medium Term)
Create pre-joined views for commonly filtered tables:
```sql
CREATE MATERIALIZED VIEW mv_table_cells AS
SELECT 
  r.id as row_id,
  r."tableId",
  r."createdAt",
  c."columnId",
  c."flattenedValueText",
  c."flattenedValueNumber"
FROM "Row" r
LEFT JOIN "Cell" c ON r.id = c."rowId"
WHERE r."isDeleted" = false;

CREATE INDEX idx_mv_table_cells ON mv_table_cells("tableId", "columnId", "flattenedValueText");
```

### 3. Implement Search Index (Long Term)
For text search, consider:
- PostgreSQL Full Text Search with GIN indexes
- Elasticsearch for complex search requirements
- Dedicated search columns with trigram indexes for "contains" queries

### 4. Query Optimization (Immediate)
Modify the row fetching to:
1. Limit filters to indexed operations when possible
2. Use exact match instead of ILIKE where feasible
3. Consider server-side result caching for common filters

### 5. Alternative Approach: Denormalization
For read-heavy workloads with 100k+ rows:
- Create a denormalized table structure
- Store row data in JSONB columns
- Use PostgreSQL's JSONB indexes for filtering

## Recommended Actions

### Immediate (1-2 days)
1. Add the missing indexes mentioned above
2. Analyze query plans with EXPLAIN ANALYZE
3. Implement query result caching on the server

### Short Term (1 week)
1. Create materialized views for large tables
2. Optimize ILIKE queries with trigram indexes
3. Add query complexity limits

### Long Term (2-4 weeks)
1. Evaluate denormalization for large tables
2. Implement dedicated search infrastructure
3. Consider read replicas for query distribution

## Monitoring
Track these metrics:
- Query execution time
- Index usage statistics
- Cache hit rates
- Database connection pool usage

## Expected Improvements
With the immediate optimizations:
- Initial load: 5-7s → 1-2s
- Subsequent loads: Instant (cached)
- Scrolling: Minimal impact

With full optimizations:
- Initial load: < 500ms for most queries
- Complex filters: < 1s
- Scalable to millions of rows