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
import { AddRowDropdown } from "./AddRowDropdown";
import { AddColumnForm } from "./AddColumnForm";

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
  bulkAddRows: (count: number) => Promise<{ success: boolean; count: number }>;
  isBulkInserting: boolean;
  bulkInsertProgress?: { current: number; total: number; tableId: string } | null;
  otherTableBulkInsert?: { total: number; tableId: string } | null;
  addColumn: (name: string, type: "text" | "number") => void;
  isAddingColumn?: boolean;
  columnAddProgress?: { current: number; total: number; columnName: string } | null;
  searchTerm: string;
  sorts?: { columnId: string; direction: string }[];
  filters?: { columnId: string; operator: string; value?: string | number }[];
};

export const EditableTable = ({
  rows,
  columns,
  viewConfig,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  updateCell,
  addRow: originalAddRow,
  bulkAddRows: originalBulkAddRows,
  isBulkInserting,
  bulkInsertProgress,
  otherTableBulkInsert,
  addColumn,
  isAddingColumn = false,
  columnAddProgress,
  searchTerm,
  sorts = [],
  filters = [],
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
    count: tableRows.length,
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
    <div className="relative h-full max-h-[80vh] flex flex-col">
      {/* Fixed header row */}
      <div className="flex border-t border-l border-r rounded-t bg-white sticky top-0 z-20">
        <div className="w-10 h-10 bg-gray-50 border-r border-b flex items-center justify-center font-bold">
          #
        </div>
        {visibleColumnsOrdered.map((column) => {
          const isSorted = sorts.some(s => s.columnId === column.id);
          const isFiltered = filters.some(f => f.columnId === column.id);
          return (
            <div
              key={column.id}
              className="w-[150px] h-10 border-r border-b flex items-center px-2 font-medium"
              style={{
                backgroundColor: isFiltered ? "#d1fae5" : isSorted ? "#FFEFE6" : "white",
              }}
            >
              {column.name}
            </div>
          );
        })}
        <div className="w-10 h-10 border-r border-b flex items-center justify-center">
          <AddColumnForm onAddColumn={addColumn} isLoading={isAddingColumn} />
        </div>
      </div>
      
      {/* Scrollable table area */}
      <div
        ref={containerRef}
        className="overflow-auto relative border-l border-r flex-1 text-sm"
      >
        <VirtualizedTableBody
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
        _addRow={originalAddRow}
        _bulkAddRows={originalBulkAddRows}
        _isBulkInserting={isBulkInserting}
        _bulkInsertProgress={bulkInsertProgress}
        searchTerm={searchTerm}
        _view={null}
        sorts={sorts}
        filters={filters}
        />
        {isFetchingNextPage && (
          <div className="text-center p-2 text-gray-500">Loading more…</div>
        )}
      </div>
      
      {/* Sticky footer row - outside scroll container */}
      <div className="flex border-l border-r border-b rounded-b bg-white">
        {/* Row number column - exactly 40px like header */}
        <div className={`w-10 h-10 border-r flex items-center justify-center transition-colors ${isBulkInserting ? 'bg-blue-100' : 'bg-gray-50'}`}>
          <AddRowDropdown
            onAddRows={async (count) => {
              if (count === 1) {
                originalAddRow();
              } else {
                await originalBulkAddRows(count);
              }
            }}
            isLoading={isBulkInserting}
            progress={bulkInsertProgress}
            isFooter={true}
          />
        </div>
        {/* Fill the rest to match table width */}
        <div className={`flex-1 h-10 transition-colors ${isBulkInserting ? 'bg-blue-50' : isAddingColumn ? 'bg-green-50' : 'bg-gray-50'}`}>
          {isBulkInserting && bulkInsertProgress ? (
            <div className="px-4 py-2 text-sm text-blue-700 flex items-center gap-4">
              <span className="font-medium">
                Adding {bulkInsertProgress.total.toLocaleString()} rows:
              </span>
              <span className="text-blue-600">
                {bulkInsertProgress.current.toLocaleString()} completed
              </span>
              <span className="text-blue-500">
                ({Math.round((bulkInsertProgress.current / bulkInsertProgress.total) * 100)}%)
              </span>
              <div className="flex-1 max-w-xs">
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(bulkInsertProgress.current / bulkInsertProgress.total) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-blue-500">
                You can navigate to other tables
              </span>
            </div>
          ) : isAddingColumn && columnAddProgress ? (
            <div className="px-4 py-2 text-sm text-green-700 flex items-center gap-4">
              <span className="font-medium">
                Adding column "{columnAddProgress.columnName}":
              </span>
              <span className="text-green-600">
                {columnAddProgress.current.toLocaleString()} / {columnAddProgress.total.toLocaleString()} cells
              </span>
              <span className="text-green-500">
                ({Math.round((columnAddProgress.current / columnAddProgress.total) * 100)}%)
              </span>
              <div className="flex-1 max-w-xs">
                <div className="w-full bg-green-200 rounded-full h-1.5">
                  <div 
                    className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(columnAddProgress.current / columnAddProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ) : otherTableBulkInsert ? (
            // Show hint if there's a bulk insert happening in another table
            <div className="px-4 py-2 text-sm text-gray-600 italic">
              Bulk inserting rows in another table...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
