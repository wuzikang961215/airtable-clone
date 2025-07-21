"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CellEditor } from "./CellEditor";
import { AddColumnForm } from "./AddColumnForm";
import { AddRowDropdown } from "./AddRowDropdown";

type Row = {
  id: string;
  [columnId: string]: string;
};

type Props = {
  rows: Row[];
  columns: { id: string; name: string }[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  updateCell: (rowId: string, columnId: string, value: string) => void;
  addRow: () => void;
  addColumn: (name: string, type: "text" | "number") => void;
};

export const EditableTable = ({
  rows,
  columns,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  updateCell,
  addRow,
  addColumn,
}: Props) => {
  // ❗ hooks must be declared unconditionally
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const shouldRenderTable = columns && columns.length > 0;

  const table = useReactTable({
    data: rows,
    columns: columns.map(
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
      <div
        style={{
          width: columnVirtualizer.getTotalSize() + 40,
          height: rowVirtualizer.getTotalSize() + 40,
          position: "relative",
        }}
      >
        {/* Top-left corner header */}
        <div className="absolute top-0 left-0 w-10 h-10 bg-gray-50 border-r border-b flex items-center justify-center font-bold z-10">
          #
        </div>

        {/* Headers */}
        {table.getHeaderGroups().map((hg) =>
          vCols.map((vc) => {
            const isRightmost = vc.index === visibleColumns.length;
            const header = hg.headers[vc.index];

            return (
              <div
                key={vc.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: vc.start + 40,
                  width: vc.size,
                  height: 40,
                  padding: "0 8px",
                  background: "white",
                  fontWeight: 500,
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {isRightmost ? (
                  <AddColumnForm onAddColumn={addColumn} />
                ) : (
                  header && flexRender(header.column.columnDef.header, header.getContext())
                )}
              </div>
            );
          })
        )}

        {/* Row numbers + Cells */}
        {vRows.map((vr) => {
          const isBottomRow = vr.index === tableRows.length;
          const row = tableRows[vr.index];

          return (
            <React.Fragment key={vr.key}>
              {/* Row index / Add Row */}
              <div
                style={{
                  position: "absolute",
                  top: vr.start + 40,
                  left: 0,
                  width: 40,
                  height: vr.size,
                  borderBottom: "1px solid #eee",
                  borderRight: "1px solid #eee",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 500,
                  background: isBottomRow ? "#f9fafb" : "white",
                }}
              >
                {isBottomRow ? (
                  <AddRowDropdown
                    onAddRows={(count) => {
                      for (let i = 0; i < count; i++) addRow();
                    }}
                  />
                ) : (
                  vr.index + 1
                )}
              </div>

              {/* Row cells */}
              {vCols.map((vc) => {
                const col = visibleColumns[vc.index];
                const isRightmost = vc.index === visibleColumns.length;
                if (!col || isRightmost || isBottomRow || !row) return null;

                const cell = row.getVisibleCells().find((c) => c.column.id === col.id);
                if (!cell) return null;

                const cellKey = {
                  rowId: row.original.id,
                  columnId: cell.column.id,
                };

                const isSelected =
                  selectedCell?.rowId === cellKey.rowId &&
                  selectedCell?.columnId === cellKey.columnId;

                const isEditing =
                  editingCell?.rowId === cellKey.rowId &&
                  editingCell?.columnId === cellKey.columnId;

                const cellValue = cell.getValue();

                return (
                  <div
                    key={cell.id}
                    onClick={() => setSelectedCell(cellKey)}
                    onDoubleClick={() => setEditingCell(cellKey)}
                    style={{
                      position: "absolute",
                      top: vr.start + 40,
                      left: vc.start + 40,
                      width: vc.size,
                      height: vr.size,
                      padding: "0 8px",
                      borderRight: "1px solid #eee",
                      borderBottom: "1px solid #eee",
                      display: "flex",
                      alignItems: "center",
                      background: "white",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      border: isSelected ? "2px solid #3b82f6" : "1px solid #eee",
                    }}
                    title={
                      typeof cellValue === "string" || typeof cellValue === "number"
                        ? String(cellValue)
                        : undefined
                    }
                  >
                    {isEditing ? (
                      <CellEditor
                        value={typeof cellValue === "string" || typeof cellValue === "number" ? String(cellValue) : ""}
                        onChange={(newVal) => updateCell(cellKey.rowId, cellKey.columnId, newVal)}
                        onBlur={() => setEditingCell(null)}
                      />
                    ) : (
                      <span className="truncate block w-full">
                        {typeof cellValue === "string" || typeof cellValue === "number"
                          ? cellValue
                          : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {isFetchingNextPage && (
        <div className="text-center p-2 text-gray-500">Loading more…</div>
      )}
    </div>
  );
};
