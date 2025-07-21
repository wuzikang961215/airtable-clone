import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";

// ─── Types ───────────────────────────────────────────────────────────────
type Cell = { columnId: string; value: string };
type Row = { id: string; cells: Cell[] };
type Page = { rows: Row[]; nextCursor?: string };
type Column = { id: string; name: string; type: string };

type FlatRow = {
  id: string;
  [columnId: string]: string;
};

type Filter = { columnId: string; operator: "equals" | "contains"; value: string };
type Sort = { columnId: string; direction: "asc" | "desc" };

// ─── Hook ────────────────────────────────────────────────────────────────
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

  // ─── Build Filter + Sort Input ─────────────────────────────────────────
  const rowQueryInput = useMemo(() => {
    const base: {
      tableId: string;
      limit: number;
      filters?: Filter[];
      sorts?: Sort[];
    } = { tableId, limit: 100 };

    if (view?.filters) base.filters = view.filters as Filter[];
    if (view?.sorts) base.sorts = view.sorts as Sort[];

    return base;
  }, [tableId, view]);

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

    void updateCellMutation.mutate({ rowId, columnId, value });
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
    loading: loadingColumns || loadingRows,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    updateCell,
    addRow,
    addColumn,
  };
}
