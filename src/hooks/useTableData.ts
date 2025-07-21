import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";

// Type Definitions
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

export function useTableData(tableId: string, viewId?: string) {
  const [rowsById, setRowsById] = useState<Record<string, FlatRow>>({});

  // Fetch columns
  const { data: columns, isLoading: loadingColumns } =
    api.column.getByTable.useQuery({ tableId });

  // Fetch view config if provided
  const { data: view } = api.view.getById.useQuery(
    { viewId: viewId! },
    { enabled: !!viewId }
  );

  // Memoized input for rows query
  const rowQueryInput = useMemo(() => {
    const baseInput: {
      tableId: string;
      limit: number;
      filters?: Filter[];
      sorts?: Sort[];
    } = {
      tableId,
      limit: 100,
    };

    if (view?.filters) baseInput.filters = view.filters as Filter[];
    if (view?.sorts) baseInput.sorts = view.sorts as Sort[];

    return baseInput;
  }, [tableId, view]);

  const {
    data: rowPages,
    isLoading: loadingRows,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = api.row.getByTable.useInfiniteQuery(rowQueryInput, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Mutations
  const updateCellMutation = api.cell.update.useMutation();
  const addRowMutation = api.row.add.useMutation();
  const addColumnMutation = api.column.add.useMutation();

  // Normalize row data
  useEffect(() => {
    if (!rowPages) return;

    const updated: Record<string, FlatRow> = {};
    for (const page of rowPages.pages as Page[]) {
      for (const row of page.rows) {
        const flatRow: FlatRow = { id: row.id };
        for (const cell of row.cells) {
          flatRow[cell.columnId] = cell.value ?? "";
        }
        updated[row.id] = flatRow;
      }
    }

    setRowsById((prev) => ({ ...prev, ...updated }));
  }, [rowPages]);

  return {
    rowsById,
    columns: (columns ?? []) as Column[],
    loading: loadingColumns || loadingRows,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,

    updateCell: (rowId: string, columnId: string, value: string) => {
      setRowsById((prev) => {
        const prevRow = prev[rowId] ?? { id: rowId };
        return {
          ...prev,
          [rowId]: {
            ...prevRow,
            [columnId]: value,
          },
        };
      });

      updateCellMutation.mutate({ rowId, columnId, value });
    },

    addRow: () => {
      addRowMutation.mutate(
        { tableId },
        {
          onSuccess: (newRow) => {
            const flatRow: FlatRow = { id: newRow.id };
            for (const cell of newRow.cells) {
              flatRow[cell.columnId] = cell.value ?? "";
            }

            setRowsById((prev) => ({
              ...prev,
              [newRow.id]: flatRow,
            }));
          },
        }
      );
    },

    addColumn: (name: string, type: "text" | "number") => {
      addColumnMutation.mutate(
        { tableId, name, type },
        {
          onSuccess: () => {
            // Optional: re-fetch or update column list if needed
          },
        }
      );
    },
  };
}
