import { useEffect, useMemo, useState } from "react";
import debounce from "lodash.debounce"; // ✅ 若报错需执行：npm i -D @types/lodash.debounce
import { api } from "~/trpc/react";

// ─── Types ───────────────────────────────────────────────────────────────
type Cell = { columnId: string; value: string };
type Row = { id: string; cells: Cell[] };

type FlatRow = {
  id: string;
  [columnId: string]: string;
};

type Filter = { columnId: string; operator: "equals" | "contains"; value: string };
type Sort = { columnId: string; direction: "asc" | "desc" };

export function useTableData(tableId: string, viewId?: string) {
  const [rowsById, setRowsById] = useState<Record<string, FlatRow>>({});

  const utils = api.useUtils();

  // ─── Fetch Columns ─────────────────────────────────────────────────────
  const {
    data: columns = [],
    isLoading: loadingColumns,
  } = api.column.getByTable.useQuery({ tableId });

  // ─── Fetch View Config ─────────────────────────────────────────────────
  const { data: view } = api.view.getById.useQuery(
    { viewId: viewId! },
    { enabled: !!viewId }
  );

  const viewConfig = useMemo(() => {
    const columnOrder = Array.isArray(view?.columnOrder)
      ? (view?.columnOrder as string[]) // ✅ 安全断言为 string[]
      : columns.map((c) => c.id);

    const hiddenColumnIds = Array.isArray(view?.hiddenColumns)
      ? (view?.hiddenColumns as string[]) // ✅ 安全断言为 string[]
      : [];

    return {
      filters: (view?.filters ?? []) as Filter[],
      sorts: (view?.sorts ?? []) as Sort[],
      columnOrder,
      hiddenColumnIds,
    };
  }, [view, columns]);

  // ─── Build Filter + Sort Input ─────────────────────────────────────────
  const rowQueryInput = useMemo(() => {
    const base: {
      tableId: string;
      limit: number;
      filters?: Filter[];
      sorts?: Sort[];
    } = { tableId, limit: 100 };

    if (viewConfig.filters.length > 0) base.filters = viewConfig.filters;
    if (viewConfig.sorts.length > 0) base.sorts = viewConfig.sorts;

    return base;
  }, [tableId, viewConfig.filters, viewConfig.sorts]);

  // ─── Fetch Rows ────────────────────────────────────────────────────────
  const {
    data: rowPages,
    isLoading: loadingRows,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = api.row.getByTable.useInfiniteQuery(rowQueryInput, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────
  const updateCellMutation = api.cell.update.useMutation({
    onError: (err) => console.error("❌ Failed to update cell", err),
  });

  const addRowMutation = api.row.add.useMutation({
    onError: (err) => console.error("❌ Failed to add row", err),
  });

  const addColumnMutation = api.column.add.useMutation({
    onSuccess: () => {
      void utils.column.getByTable.invalidate({ tableId });
    },
    onError: (err) => console.error("❌ Failed to add column", err),
  });

  // ─── Debounced Cell Update Map ─────────────────────────────────────────
  const debouncedMutations = useMemo(() => {
    const cache = new Map<string, (value: string) => void>();

    return (rowId: string, columnId: string) => {
      const key = `${rowId}::${columnId}`;
      if (!cache.has(key)) {
        const fn = debounce((value: string) => {
          updateCellMutation.mutate({ rowId, columnId, value });
        }, 500);
        cache.set(key, fn);
      }
      return cache.get(key)!;
    };
  }, []);

  // ─── Normalize Rows ────────────────────────────────────────────────────
  useEffect(() => {
    if (!rowPages) return;

    const updated: Record<string, FlatRow> = {};

    for (const page of rowPages.pages) {
      for (const row of page.rows) {
        const flat: FlatRow = { id: row.id };
        for (const cell of row.cells) {
          flat[cell.columnId] = cell.value ?? "";
        }
        updated[row.id] = flat;
      }
    }

    setRowsById((prev) => ({ ...prev, ...updated }));
  }, [rowPages]);

  // ─── Actions ───────────────────────────────────────────────────────────
  const updateCell = (rowId: string, columnId: string, value: string) => {
    setRowsById((prev) => {
      const row = prev[rowId] ?? { id: rowId };
      return {
        ...prev,
        [rowId]: { ...row, [columnId]: value },
      };
    });

    debouncedMutations(rowId, columnId)(value);
  };

  const addRow = () => {
    void addRowMutation.mutate(
      { tableId },
      {
        onSuccess: (newRow) => {
          const flatRow: FlatRow = { id: newRow.id };
          for (const cell of newRow.cells) {
            flatRow[cell.columnId] = cell.value ?? "";
          }
          setRowsById((prev) => ({ ...prev, [newRow.id]: flatRow }));
        },
      }
    );
  };

  const addColumn = (name: string, type: "text" | "number") => {
    void addColumnMutation.mutate({ tableId, name, type });
  };

  // ─── Return Interface ──────────────────────────────────────────────────
  return {
    rowsById,
    columns,
    viewConfig,
    loading: loadingColumns || loadingRows,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    updateCell,
    addRow,
    addColumn,
  };
}
