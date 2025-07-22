"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCellNavigation } from "./EditableTable/useCellNavigation";
import { useColumnAndRowMaps } from "./EditableTable/useColumnAndRowMaps";
import { VirtualizedTableBody } from "./EditableTable/VirtualizedTableBody";

type Row = {
  id: string;
  [columnId: string]: string;
};

type Props = {
  rows: Row[];
  columns: { id: string; name: string }[];
  viewConfig: {
    columnOrder: string[];
    hiddenColumnIds: string[];
  };
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  updateCell: (rowId: string, columnId: string, value: string) => void;
  addRow: () => void;
  addColumn: (name: string, type: "text" | "number") => void;
  searchTerm?: string;
};

export const EditableTable = ({
  rows,
  columns,
  viewConfig,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  updateCell,
  addRow,
  addColumn,
  searchTerm,
}: Props) => {
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleColumnsOrdered = React.useMemo(() => {
    const map = new Map(columns.map((c) => [c.id, c]));
    return viewConfig.columnOrder
      .filter((id) => !viewConfig.hiddenColumnIds.includes(id))
      .map((id) => map.get(id))
      .filter(Boolean) as { id: string; name: string }[];
  }, [columns, viewConfig]);

  const shouldRenderTable = visibleColumnsOrdered.length > 0;

  const table = useReactTable({
    data: rows,
    columns: visibleColumnsOrdered.map(
      (c): ColumnDef<Row> => ({
        accessorKey: c.id,
        header: c.name,
        cell: (info) => info.getValue(),
        size: 150,
      })
    ),
    defaultColumn: { size: 150 },
    getCoreRowModel: getCoreRowModel(),
  });

  const visibleColumns = table.getVisibleLeafColumns();
  const tableRows = table.getRowModel().rows;

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: visibleColumns.length + 1,
    estimateSize: (i) =>
      i === visibleColumns.length ? 40 : visibleColumns[i]?.getSize() ?? 150,
    getScrollElement: () => containerRef.current,
    overscan: 2,
  });

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length + 1,
    estimateSize: () => 40,
    getScrollElement: () => containerRef.current,
    overscan: 10,
  });

  const vCols = columnVirtualizer.getVirtualItems();
  const vRows = rowVirtualizer.getVirtualItems();

  const { columnIdToIndex, rowIdToIndex, rowIdList } = useColumnAndRowMaps(
    tableRows,
    visibleColumns
  );

  // Auto-select first cell
  useEffect(() => {
    if (!selectedCell && tableRows.length > 0 && visibleColumns.length > 0) {
      const firstRow = tableRows[0];
      const firstCol = visibleColumns[0];

      if (firstRow?.original?.id && firstCol?.id) {
        setSelectedCell({
          rowId: firstRow.original.id,
          columnId: firstCol.id,
        });
      }
    }
  }, [selectedCell, tableRows, visibleColumns]);



  useCellNavigation({
    selectedCell,
    setSelectedCell,
    editingCell,
    setEditingCell,
    columnIdToIndex,
    rowIdToIndex,
    visibleColumns,
    rowIdList,
  });

  useEffect(() => {
    const lastItem = vRows[vRows.length - 1];
    if (lastItem && lastItem.index >= tableRows.length - 1 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [vRows, tableRows.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!shouldRenderTable) {
    return <div className="p-4 text-gray-500">No columns found</div>;
  }

  return (
    <div
      ref={containerRef}
      className="overflow-auto relative border rounded max-h-[80vh] text-sm"
    >
      <VirtualizedTableBody
        table={table} // ✅ REQUIRED
        containerRef={containerRef}
        tableRows={tableRows}
        visibleColumns={visibleColumns}
        vRows={vRows}
        vCols={vCols}
        updateCell={updateCell}
        editingCell={editingCell}
        selectedCell={selectedCell}
        setSelectedCell={setSelectedCell}
        setEditingCell={setEditingCell}
        addRow={addRow}
        addColumn={addColumn}
        searchTerm={searchTerm}
      />
      {isFetchingNextPage && (
        <div className="text-center p-2 text-gray-500">Loading more…</div>
      )}
    </div>
  );
};
