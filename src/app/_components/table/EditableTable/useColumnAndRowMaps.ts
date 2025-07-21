import { useMemo } from "react";
import type { Column, Row } from "@tanstack/react-table";

export const useColumnAndRowMaps = <
  TData = unknown,
  TValue = unknown
>(
  tableRows: Row<TData>[],
  visibleColumns: Column<TData, TValue>[]
) => {
  const rowIdList = useMemo(() => tableRows.map((r) => r.id), [tableRows]);

  const rowIdToIndex = useMemo(() => {
    const map = new Map<string, number>();
    rowIdList.forEach((id, idx) => map.set(id, idx));
    return map;
  }, [rowIdList]);

  const columnIdToIndex = useMemo(() => {
    const map = new Map<string, number>();
    visibleColumns.forEach((col, idx) => map.set(col.id, idx));
    return map;
  }, [visibleColumns]);

  return {
    rowIdList,
    rowIdToIndex,
    columnIdToIndex,
  };
};
