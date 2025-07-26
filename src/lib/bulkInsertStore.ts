// Simple in-memory store for tracking active bulk inserts
const activeBulkInserts = new Map<string, { total: number; tableId: string }>();

export const bulkInsertStore = {
  setActive: (tableId: string, total: number) => {
    activeBulkInserts.set(tableId, { total, tableId });
  },
  
  clear: (tableId: string) => {
    activeBulkInserts.delete(tableId);
  },
  
  hasAnyActive: () => {
    return activeBulkInserts.size > 0;
  },
  
  getActiveForOtherTable: (currentTableId: string) => {
    for (const [tableId, data] of activeBulkInserts) {
      if (tableId !== currentTableId) {
        return data;
      }
    }
    return null;
  }
};