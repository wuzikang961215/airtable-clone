import { useEffect, useMemo, useState } from "react";
import debounce from "lodash.debounce";
import { api } from "~/trpc/react";

// ─── Types ───────────────────────────────────────────────────────────────
type Cell = { columnId: string; value: string };
type Row = { id: string; cells: Cell[] };
type FlatRow = { id: string;[columnId: string]: string };
type Filter = { columnId: string; operator: "equals" | "contains"; value: string };
type Sort = { columnId: string; direction: "asc" | "desc" };

export function useTableData(tableId: string, viewId?: string) {
  const [allRowsByKey, setAllRowsByKey] = useState<Record<string, Record<string, FlatRow>>>({});
  const [skipNextRemoteOverwrite, setSkipNextRemoteOverwrite] = useState(false);

  const currentKey = `${tableId}:${viewId ?? ""}`;
  const rowsById = allRowsByKey[currentKey] ?? {};

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
    const columnOrder =
      Array.isArray(view?.columnOrder) && view.columnOrder.length > 0
        ? view.columnOrder
        : columns.map((c) => c.id);

    const hiddenColumnIds = Array.isArray(view?.hiddenColumns)
      ? (view?.hiddenColumns as string[])
      : [];

    return {
      filters: (view?.filters ?? []) as Filter[],
      sorts: (view?.sorts ?? []) as Sort[],
      columnOrder,
      hiddenColumnIds,
    };
  }, [view, columns]);

  // ─── Build Query Key ───────────────────────────────────────────────────
  const rowQueryInput = useMemo(() => {
    return {
      tableId,
      viewId,
      limit: 100,
      filters: viewConfig.filters,
      sorts: viewConfig.sorts,
    };
  }, [tableId, viewId, viewConfig.filters, viewConfig.sorts]);

  // ─── Fetch Rows ────────────────────────────────────────────────────────
  const {
    data: rowPages,
    isLoading: loadingRows,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = api.row.getByTable.useInfiniteQuery(rowQueryInput, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: Infinity,
    gcTime: 60 * 1000,
  });

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

  const addColumnMutation = api.column.add.useMutation({
    onSuccess: () => {
      void utils.column.getByTable.invalidate({ tableId });
    },
    onError: (err) => console.error("❌ Failed to add column", err),
  });

  const addRowMutation = api.row.add.useMutation();

  // ─── Normalize + Replace Rows ──────────────────────────────────────────
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

    if (skipNextRemoteOverwrite) {
      setSkipNextRemoteOverwrite(false);
      return;
    }

    setAllRowsByKey((prev) => ({
      ...prev,
      [currentKey]: updated,
    }));
  }, [rowPages, tableId, viewId, JSON.stringify(viewConfig), skipNextRemoteOverwrite]);

  // ─── Actions ───────────────────────────────────────────────────────────
  const updateCell = (rowId: string, columnId: string, value: string) => {
    setAllRowsByKey((prev) => {
      const existing = prev[currentKey] ?? {};
      const row = existing[rowId] ?? { id: rowId };
      return {
        ...prev,
        [currentKey]: {
          ...existing,
          [rowId]: { ...row, [columnId]: value },
        },
      };
    });

    setSkipNextRemoteOverwrite(true);
    updateCellMutation.mutate({ rowId, columnId, value });
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
          setAllRowsByKey((prev) => ({
            ...prev,
            [currentKey]: {
              ...(prev[currentKey] ?? {}),
              [newRow.id]: flatRow,
            },
          }));
        },
      }
    );
  };

  const addColumn = (name: string, type: "text" | "number") => {
    void addColumnMutation.mutate({ tableId, name, type });
  };

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
