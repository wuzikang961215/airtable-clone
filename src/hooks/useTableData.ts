import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { bulkInsertStore } from "~/lib/bulkInsertStore";

// ─── Enhanced Types ─────────────────────────────────────────────────────
type FlatRow = { id: string; [columnId: string]: string };

// Enhanced filter types matching the API schema
type TextFilter = {
  columnId: string;
  columnType: "text";
  operator: "contains" | "equals" | "not_contains" | "is_empty" | "is_not_empty";
  value?: string;
};

type NumberFilter = {
  columnId: string;
  columnType: "number";
  operator: "equals" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "is_empty" | "is_not_empty";
  value?: number;
};

type Filter = TextFilter | NumberFilter;

type Sort = {
  columnId: string;
  columnType: "text" | "number";
  direction: "asc" | "desc";
};

type ViewConfig = {
  filters: Filter[];
  sorts: Sort[];
  columnOrder: string[];
  hiddenColumnIds: string[];
};

export function useTableData(tableId: string, viewId?: string | null) {
  const utils = api.useUtils();
  const [isBulkInserting, setIsBulkInserting] = useState(false);

  // ─── Fetch Columns ─────────────────────────────────────────────────────
  const {
    data: columns = [],
    isLoading: loadingColumns,
  } = api.column.getByTable.useQuery(
    { tableId },
    {
      // Ensure columns are fresh when switching views
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 5000 // 5 seconds
    }
  );

  // ─── Fetch View Config ─────────────────────────────────────────────────
  const { data: view } = api.view.getById.useQuery(
    { viewId: viewId! },
    { 
      enabled: !!viewId && viewId.trim() !== "",
      // Refetch when view changes to ensure fresh data
      refetchOnMount: true,
      staleTime: 0
    }
  );

  const viewConfig = useMemo((): ViewConfig => {
    const columnOrder =
      Array.isArray(view?.columnOrder) && view.columnOrder.length > 0
        ? (view.columnOrder as string[])
        : columns.map((c) => c.id);

    const hiddenColumnIds = Array.isArray(view?.hiddenColumns)
      ? (view.hiddenColumns as string[])
      : [];

    // Create column type map for filter/sort validation
    const columnTypeMap = new Map(columns.map(col => [col.id, col.type as "text" | "number"]));

    // Transform and validate filters from view data
    const filters: Filter[] = Array.isArray(view?.filters) 
      ? (view.filters as unknown[]).map((f): Filter | null => {
          if (typeof f !== 'object' || f === null) return null;
          const filter = f as Record<string, unknown>;
          
          if (typeof filter.columnId !== 'string') return null;
          const columnType = columnTypeMap.get(filter.columnId);
          if (!columnType) return null;
          
          if (columnType === 'text') {
            const textOps = ['contains', 'equals', 'not_contains', 'is_empty', 'is_not_empty'];
            if (typeof filter.operator === 'string' && textOps.includes(filter.operator)) {
              return {
                columnId: filter.columnId,
                columnType: 'text',
                operator: filter.operator as TextFilter['operator'],
                value: typeof filter.value === 'string' ? filter.value : undefined,
              };
            }
          } else if (columnType === 'number') {
            const numberOps = ['equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'is_empty', 'is_not_empty'];
            if (typeof filter.operator === 'string' && numberOps.includes(filter.operator)) {
              return {
                columnId: filter.columnId,
                columnType: 'number',
                operator: filter.operator as NumberFilter['operator'],
                value: typeof filter.value === 'number' ? filter.value : undefined,
              };
            }
          }
          return null;
        }).filter((f): f is Filter => f !== null)
      : [];

    // Transform and validate sorts from view data
    const sorts: Sort[] = Array.isArray(view?.sorts)
      ? (view.sorts as unknown[]).map((s): Sort | null => {
          if (typeof s !== 'object' || s === null) return null;
          const sort = s as Record<string, unknown>;
          
          if (typeof sort.columnId !== 'string') return null;
          const columnType = columnTypeMap.get(sort.columnId);
          if (!columnType) return null;
          
          if (typeof sort.direction === 'string' && ['asc', 'desc'].includes(sort.direction)) {
            return {
              columnId: sort.columnId,
              columnType,
              direction: sort.direction as 'asc' | 'desc',
            };
          }
          return null;
        }).filter((s): s is Sort => s !== null)
      : [];

    return {
      filters,
      sorts,
      columnOrder,
      hiddenColumnIds,
    };
  }, [view, columns]);

  // ─── Compute Ordered + Visible Columns ─────────────────────────────────
  const visibleOrderedColumns = useMemo(() => {
    const idToCol = Object.fromEntries(columns.map((col) => [col.id, col]));

    const ordered = viewConfig.columnOrder
      .map((id) => idToCol[id])
      .filter((col): col is typeof columns[0] => !!col);

    const unordered = columns.filter(
      (col) =>
        !viewConfig.columnOrder.includes(col.id) &&
        !viewConfig.hiddenColumnIds.includes(col.id)
    );

    const final = [...ordered, ...unordered].filter(
      (col) => !viewConfig.hiddenColumnIds.includes(col.id)
    );

    return final;
  }, [columns, viewConfig.columnOrder, viewConfig.hiddenColumnIds]);

  // ─── Build Query Key ───────────────────────────────────────────────────
  const rowQueryInput = useMemo(() => {
    const input: {
      tableId: string;
      viewId?: string;
      limit: number;
      filters: Filter[];
      sorts: Sort[];
    } = {
      tableId,
      limit: 100,
      filters: viewConfig.filters, // Use filters from view configuration
      sorts: viewConfig.sorts, // Use sorts from view configuration
    };
    
    // Only include viewId if it's a valid non-empty string
    if (viewId && viewId.trim() !== "") {
      input.viewId = viewId;
    }
    
    return input;
  }, [tableId, viewId, viewConfig.filters, viewConfig.sorts]);
  
  // ─── Fetch Rows ────────────────────────────────────────────────────────
  const {
    data: rowPages,
    isLoading: loadingRows,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = api.row.getByTable.useInfiniteQuery(
    rowQueryInput,
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      staleTime: 0,
      gcTime: 0,
      // Reset pages when query key changes (e.g., when sorts change)
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    }
  );


  const rowsById = useMemo(() => {
    if (!rowPages) return {};
    const output: Record<string, FlatRow> = {};
    for (const page of rowPages.pages) {
      for (const row of page.rows) {
        const flat: FlatRow = { id: row.id };
        for (const cell of row.cells) {
          flat[cell.columnId] = cell.value ?? "";
        }
        output[row.id] = flat;
      }
    }
    return output;
  }, [rowPages]);

  // Get total count from the first page
  const totalRowCount = rowPages?.pages[0]?.totalCount ?? 0;

  // ─── Mutations ─────────────────────────────────────────────────────────
  const updateCellMutation = api.cell.update.useMutation({
    onMutate: async (newCell) => {
      await utils.row.getByTable.cancel(rowQueryInput);
      const previousData = utils.row.getByTable.getInfiniteData(rowQueryInput);

      utils.row.getByTable.setInfiniteData(rowQueryInput, (old) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            rows: page.rows.map((row) => {
              if (row.id !== newCell.rowId) return row;
              return {
                ...row,
                cells: row.cells.map((cell) =>
                  cell.columnId === newCell.columnId
                    ? { ...cell, value: newCell.value }
                    : cell
                ),
              };
            }),
          })),
        };
      });

      return { previousData };
    },

    onError: (_err, _newCell, ctx) => {
      if (ctx?.previousData) {
        utils.row.getByTable.setInfiniteData(rowQueryInput, ctx.previousData);
      }
    },

    onSettled: () => {
      void utils.row.getByTable.invalidate(rowQueryInput);
    },
  });

  const addColumnMutation = api.column.add.useMutation();

  // Poll for column addition progress
  const { data: columnAddProgress } = api.column.getColumnAddProgress.useQuery(
    { tableId },
    { 
      refetchInterval: addColumnMutation.isPending ? 500 : false,
      enabled: addColumnMutation.isPending
    }
  );

  const addRowMutation = api.row.add.useMutation();
  const bulkCreateRowsMutation = api.row.bulkCreateRows.useMutation();
  
  // Poll for bulk insert progress only when there's an active bulk insert
  const { data: bulkInsertProgress } = api.row.getBulkInsertProgress.useQuery(
    { tableId },
    { 
      enabled: isBulkInserting,
      refetchInterval: 500,
      staleTime: 0
    }
  );

  // ─── Actions ───────────────────────────────────────────────────────────
  const updateCell = (rowId: string, columnId: string, value: string) => {
    updateCellMutation.mutate({ rowId, columnId, value });
  };

  const addRow = () => {
    // Generate a temporary ID for optimistic update
    const tempRowId = `temp-${Date.now()}`;
    
    // Optimistically add the row to the cache
    utils.row.getByTable.setInfiniteData(rowQueryInput, (old) => {
      if (!old) return old;
      
      // Create optimistic row with empty cells
      const newRow = {
        id: tempRowId,
        tableId,
        createdAt: new Date(),
        isDeleted: false,
        cells: columns.map(col => ({
          id: `temp-cell-${col.id}`,
          rowId: tempRowId,
          columnId: col.id,
          value: "",
          flattenedValueText: col.type === "text" ? "" : null,
          flattenedValueNumber: col.type === "number" ? null : null,
        }))
      };
      
      return {
        ...old,
        pages: old.pages.map((page, index) => {
          // Add to the last page
          if (index === old.pages.length - 1) {
            return {
              ...page,
              rows: [...page.rows, newRow]
            };
          }
          return page;
        }),
      };
    });
    
    // Now mutate to create the real row
    void addRowMutation.mutate({ tableId }, {
      onSuccess: () => {
        // Invalidate to replace temp row with real data
        void utils.row.getByTable.invalidate(rowQueryInput);
      },
      onError: () => {
        // On error, invalidate to remove the optimistic row
        void utils.row.getByTable.invalidate(rowQueryInput);
      },
    });
    
    // Return the temp ID so the UI can scroll to it immediately
    return tempRowId;
  };

  const bulkAddRows = (count: number) => {
    setIsBulkInserting(true);
    bulkInsertStore.setActive(tableId, count);
    return bulkCreateRowsMutation.mutateAsync({ tableId, count }, {
      onSuccess: () => {
        void utils.row.getByTable.invalidate(rowQueryInput);
      },
      onSettled: () => {
        setIsBulkInserting(false);
        bulkInsertStore.clear(tableId);
      },
    });
  };

  const addColumn = (name: string, type: "text" | "number") => {
    // Create the actual column
    void addColumnMutation.mutate({ tableId, name, type }, {
      onSuccess: () => {
        // Invalidate columns to get fresh data
        void utils.column.getByTable.invalidate({ tableId });
        // Invalidate view to get updated column order
        if (viewId) {
          void utils.view.getById.invalidate({ viewId });
        }
        // Invalidate row data to fetch the new cells
        void utils.row.getByTable.invalidate(rowQueryInput);
      }
    });
  };

  // ─── Helper Functions ──────────────────────────────────────────────────
  const createTextFilter = (columnId: string, operator: TextFilter['operator'], value?: string): TextFilter => ({
    columnId,
    columnType: 'text',
    operator,
    value,
  });

  const createNumberFilter = (columnId: string, operator: NumberFilter['operator'], value?: number): NumberFilter => ({
    columnId,
    columnType: 'number',
    operator,
    value,
  });

  const createSort = (columnId: string, direction: 'asc' | 'desc'): Sort => {
    const column = columns.find(col => col.id === columnId);
    const columnType = (column?.type as 'text' | 'number') ?? 'text';
    return {
      columnId,
      columnType,
      direction,
    };
  };

  // Check for bulk inserts in other tables
  const otherTableBulkInsert = bulkInsertStore.getActiveForOtherTable(tableId);

  return {
    rowsById,
    columns,
    viewConfig,
    visibleOrderedColumns,
    loading: loadingColumns || loadingRows,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    updateCell,
    addRow,
    bulkAddRows,
    isBulkInserting: isBulkInserting || bulkCreateRowsMutation.isPending,
    bulkInsertProgress,
    otherTableBulkInsert,
    addColumn,
    isAddingColumn: addColumnMutation.isPending,
    columnAddProgress,
    totalRowCount,
    // Helper functions for creating filters and sorts
    createTextFilter,
    createNumberFilter,
    createSort,
  };
}

// Export types for use in other components
export type { Filter, TextFilter, NumberFilter, Sort, ViewConfig };
