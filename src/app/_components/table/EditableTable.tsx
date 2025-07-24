"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
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
  searchTerm: string;
  sorts?: { columnId: string; direction: string }[];
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
  sorts = [],
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

  // Trigger pagination when scrolling near the bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasNextPage || isFetchingNextPage) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Trigger when scrolled to within 200px of the bottom
      const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 200;
      
      if (scrolledToBottom) {
        console.log('Scroll-based pagination trigger');
        void fetchNextPage();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Also trigger based on virtual items (as backup)
  useEffect(() => {
    const lastItem = vRows[vRows.length - 1];
    if (!lastItem || !hasNextPage || isFetchingNextPage) return;
    
    // Check if we're rendering close to the end of the data
    const isNearEnd = lastItem.index >= tableRows.length - 5;
    
    // Also check if the last virtual item is one of the last few rows
    const isLastItemNearEnd = vRows.some(item => item.index >= tableRows.length - 3);
    
    if (isNearEnd || isLastItemNearEnd) {
      console.log('Virtual item pagination trigger - lastItem.index:', lastItem.index, 'tableRows.length:', tableRows.length);
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
        _containerRef={containerRef}
        tableRows={tableRows}
        visibleColumns={visibleColumns}
        vRows={vRows}
        vCols={vCols}
        rowVirtualizer={rowVirtualizer}
        columnVirtualizer={columnVirtualizer}
        updateCell={updateCell}
        editingCell={editingCell}
        selectedCell={selectedCell}
        setSelectedCell={setSelectedCell}
        setEditingCell={setEditingCell}
        addRow={addRow}
        addColumn={addColumn}
        searchTerm={searchTerm}
        _view={null}
        sorts={sorts}
      />
      {isFetchingNextPage && (
        <div className="text-center p-2 text-gray-500">Loading more…</div>
      )}
    </div>
  );
};
