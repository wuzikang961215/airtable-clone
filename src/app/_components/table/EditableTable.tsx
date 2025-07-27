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
import { Type, Hash, Loader2 } from "lucide-react";

type Row = {
  id: string;
  [columnId: string]: string;
};

type Props = {
  rows: Row[];
  columns: { id: string; name: string; type: string }[];
  viewConfig: {
    columnOrder: string[];
    hiddenColumnIds: string[];
  };
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  updateCell: (rowId: string, columnId: string, value: string) => void;
  addRow: () => string;
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
  isLoading?: boolean;
  totalRowCount?: number;
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
  isLoading: _isLoading = false,
  totalRowCount = 0,
}: Props) => {
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Wrapper for addRow that scrolls to the new row
  const addRowWithScroll = React.useCallback(() => {
    const newRowId = originalAddRow();
    
    // Immediately scroll to bottom since the row is added optimistically
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    
    return newRowId;
  }, [originalAddRow]);

  const visibleColumnsOrdered = React.useMemo(() => {
    const map = new Map(columns.map((c) => [c.id, c]));
    return viewConfig.columnOrder
      .filter((id) => !viewConfig.hiddenColumnIds.includes(id))
      .map((id) => map.get(id))
      .filter(Boolean) as { id: string; name: string; type: string }[];
  }, [columns, viewConfig]);
  
  // Stable reference for virtualizer to prevent re-creation

  const shouldRenderTable = visibleColumnsOrdered.length > 0;

  const table = useReactTable({
    data: rows,
    columns: visibleColumnsOrdered.map(
      (c): ColumnDef<Row> => ({
        accessorKey: c.id,
        header: c.name,
        cell: (info) => info.getValue(),
        size: 180,
      })
    ),
    defaultColumn: { size: 180 },
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
    overscan: 3,
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

  // Create a map of column IDs to their types
  const columnTypeMap = React.useMemo(() => {
    const map = new Map<string, string>();
    columns.forEach(col => {
      map.set(col.id, col.type);
    });
    return map;
  }, [columns]);

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
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <p className="text-gray-500">No columns found</p>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col bg-white overflow-hidden">
      {/* Scrollable table area with sticky headers */}
      <div
        ref={containerRef}
        className="overflow-auto relative flex-1 text-[13px]"
      >
        {/* Header row - sticky vertically */}
        <div 
          className="border-b border-[#E5E5E5] sticky top-0 z-20 bg-white"
          style={{ 
            height: "32px",
            width: `${48 + columnVirtualizer.getTotalSize()}px`,
            minWidth: "100%"
          }}
        >
          <div className="w-12 h-8 bg-white border-r border-b border-[#E5E5E5] flex items-center justify-center hover:bg-[#F5F5F5] transition-colors absolute left-0 z-30">
            <div className="w-4 h-4 border border-[#D0D0D0] rounded-sm" />
          </div>
          {vCols.map((vc) => {
            const col = visibleColumns[vc.index];
            if (!col || vc.index >= visibleColumns.length) {
              // This is the add column button
              return (
                <div
                  key="add-column"
                  className="h-8 bg-white flex items-center justify-center transition-colors cursor-pointer border-r border-b border-[#E5E5E5]"
                  style={{
                    position: "absolute",
                    left: vc.start + 48,
                    width: vc.size,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F5F5F5"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                >
                  <AddColumnForm onAddColumn={addColumn} isLoading={isAddingColumn} />
                </div>
              );
            }
            
            const column = visibleColumnsOrdered.find(c => c.id === col.id);
            if (!column) return null;
            
            const isSorted = sorts.some(s => s.columnId === column.id);
            const isFiltered = filters.some(f => f.columnId === column.id);
            
            return (
              <div
                key={col.id}
                className="group h-8 px-2 border-r border-b border-[#E5E5E5] flex items-center text-[13px] font-medium text-[#333333] transition-colors cursor-pointer"
                style={{
                  position: "absolute",
                  left: vc.start + 48,
                  width: vc.size,
                  backgroundColor: isFiltered ? "#F0FFF4" : isSorted ? "#FFF5F0" : "white",
                }}
                onMouseEnter={(e) => {
                  if (!isFiltered && !isSorted) {
                    e.currentTarget.style.backgroundColor = "#F5F5F5";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isFiltered ? "#F0FFF4" : isSorted ? "#FFF5F0" : "white";
                }}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {column.type === 'number' ? (
                    <Hash className="w-4 h-4 text-[#666666] flex-shrink-0" />
                  ) : (
                    <Type className="w-4 h-4 text-[#666666] flex-shrink-0" />
                  )}
                  <span className="truncate">{column.name}</span>
                </div>
              </div>
            );
          })}
        </div>
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
        _addRow={addRowWithScroll}
        _bulkAddRows={originalBulkAddRows}
        _isBulkInserting={isBulkInserting}
        _bulkInsertProgress={bulkInsertProgress}
        searchTerm={searchTerm}
        _view={null}
        sorts={sorts}
        filters={filters}
        columnTypeMap={columnTypeMap}
        />
        {isFetchingNextPage && (
          <div className="text-center p-2 text-gray-500">Loading more…</div>
        )}
        
        {/* Sticky footer row - Airtable style */}
        <div 
          className="border-t border-[#E5E5E5] bg-white sticky bottom-0 z-20"
          style={{ 
            height: "32px",
            width: `${48 + columnVirtualizer.getTotalSize()}px`,
            minWidth: "100%"
          }}
        >
          {/* Row number column */}
          <div className={`w-12 h-8 border-r border-[#E5E5E5] flex items-center justify-center transition-colors absolute left-0 z-30 ${isBulkInserting ? 'bg-[#EBF3FE]' : 'bg-white hover:bg-[#F5F5F5]'}`}>
          <AddRowDropdown
            onAddRows={async (count) => {
              if (count === 1) {
                addRowWithScroll();
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
        <div 
          className={`h-8 transition-colors ${isBulkInserting ? 'bg-blue-50' : isAddingColumn ? 'bg-green-50' : 'bg-white'}`}
          style={{
            position: "absolute",
            left: 48,
            width: `${columnVirtualizer.getTotalSize()}px`,
          }}
        >
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
                Adding column &ldquo;{columnAddProgress.columnName}&rdquo;:
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
          ) : (
            // Show row count when not doing any operations
            <div className="px-3 h-8 flex items-center text-xs text-[#666666]">
              {totalRowCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{totalRowCount.toLocaleString()}</span>
                  <span>{totalRowCount === 1 ? 'record' : 'records'}</span>
                  {isFetchingNextPage && (
                    <>
                      <span className="text-[#999999]">•</span>
                      <Loader2 className="h-3 w-3 animate-spin text-[#999999]" />
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
