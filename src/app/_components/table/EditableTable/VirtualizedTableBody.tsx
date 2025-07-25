import React from "react";
import type { Row, Column, Table } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { AddColumnForm } from "../AddColumnForm";
import type { VirtualItem } from "@tanstack/react-virtual";
import { RowHeader } from "./RowHeader";
import { CellRenderer } from "./CellRenderer";

type CellKey = { rowId: string; columnId: string };

type Props = {
  table: Table<{ id: string;[key: string]: string }>;
  _containerRef: React.RefObject<HTMLDivElement | null>;
  tableRows: Row<{ id: string;[key: string]: string }>[];
  visibleColumns: Column<{ id: string;[key: string]: string }, unknown>[];
  vRows: VirtualItem[];
  vCols: VirtualItem[];
  rowVirtualizer: {
    getTotalSize: () => number;
  };
  columnVirtualizer: {
    getTotalSize: () => number;
  };
  updateCell: (rowId: string, columnId: string, value: string) => void;
  editingCell: CellKey | null;
  selectedCell: CellKey | null;
  setSelectedCell: (cell: CellKey) => void;
  setEditingCell: (cell: CellKey | null) => void;
  addRow: () => void;
  bulkAddRows: (count: number) => Promise<{ success: boolean; count: number }>;
  isBulkInserting: boolean;
  addColumn: (name: string, type: "text" | "number") => void;
  searchTerm: string;
  _view?: {
    sorts?: { columnId: string; direction: "asc" | "desc" }[];
  } | null;
  sorts?: { columnId: string; direction: string }[];
  filters?: { columnId: string; operator: string; value?: string | number }[];
};

export const VirtualizedTableBody = ({
  table,
  _containerRef,
  tableRows,
  visibleColumns,
  vRows,
  vCols,
  rowVirtualizer,
  columnVirtualizer,
  updateCell,
  editingCell,
  selectedCell,
  setSelectedCell,
  setEditingCell,
  addRow,
  bulkAddRows,
  isBulkInserting,
  addColumn,
  searchTerm,
  _view,
  sorts = [],
  filters = [],
}: Props) => {
  const getNextCellKey = (
    current: CellKey,
    direction: "right" | "left" | "down" | "up"
  ): CellKey | null => {
    const rowIndex = tableRows.findIndex((r) => r.original.id === current.rowId);
    const colIndex = visibleColumns.findIndex((c) => c.id === current.columnId);
    if (rowIndex === -1 || colIndex === -1) return null;

    let nextRow = rowIndex;
    let nextCol = colIndex;

    switch (direction) {
      case "right":
        nextCol++;
        if (nextCol >= visibleColumns.length) {
          nextCol = 0;
          nextRow++;
        }
        break;
      case "left":
        nextCol--;
        if (nextCol < 0) {
          nextCol = visibleColumns.length - 1;
          nextRow--;
        }
        break;
      case "down":
        nextRow++;
        break;
      case "up":
        nextRow--;
        break;
    }

    if (
      nextRow >= 0 &&
      nextRow < tableRows.length &&
      nextCol >= 0 &&
      nextCol < visibleColumns.length
    ) {
      const nextRowObj = tableRows[nextRow];
      const nextColObj = visibleColumns[nextCol];
      if (nextRowObj && nextColObj) {
        return {
          rowId: nextRowObj.original.id,
          columnId: nextColObj.id,
        };
      }
    }

    return null;
  };

  const sortedColumnIds = sorts.map((s) => s.columnId);
  const filteredColumnIds = filters.map((f) => f.columnId);

  return (
    <div
      style={{
        width: columnVirtualizer.getTotalSize() + 40,
        height: rowVirtualizer.getTotalSize() + 40,
        position: "relative",
      }}
    >
      <div className="absolute top-0 left-0 w-10 h-10 bg-gray-50 border-r border-b flex items-center justify-center font-bold z-10">
        #
      </div>

      {table.getHeaderGroups().map((group) =>
        vCols.map((vc) => {
          const isRightmost = vc.index === visibleColumns.length;
          const header = group.headers[vc.index];

          const isSortedColumn = header && sorts.some(s => s.columnId === header.column.id);
          const isFilteredColumn = header && filters.some(f => f.columnId === header.column.id);
          
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
                fontWeight: 500,
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                backgroundColor: isFilteredColumn ? "#d1fae5" : isSortedColumn ? "#FFEFE6" : "white", // green-100 for filtered, peach for sorted
              }}
            >
              {isRightmost ? (
                <AddColumnForm onAddColumn={addColumn} />
              ) : (
                header &&
                flexRender(header.column.columnDef.header, header.getContext())
              )}
            </div>
          );
        })
      )}

      {vRows.map((vr) => {
        const isBottomRow = vr.index === tableRows.length;
        const row = tableRows[vr.index];

        return (
          <React.Fragment key={vr.key}>
            <RowHeader
              top={vr.start + 40}
              height={vr.size}
              rowIndex={vr.index}
              isBottomRow={isBottomRow}
              addRow={addRow}
              bulkAddRows={bulkAddRows}
              isBulkInserting={isBulkInserting}
            />

            {vCols.map((vc) => {
              const col = visibleColumns[vc.index];
              const isRightmost = vc.index === visibleColumns.length;
              if (!col || isBottomRow || isRightmost || !row) return null;

              const cell = row.getVisibleCells().find((c) => c.column.id === col.id);
              if (!cell) return null;

              const cellKey = {
                rowId: row.original.id,
                columnId: col.id,
              };

              const isSelected =
                selectedCell?.rowId === cellKey.rowId &&
                selectedCell?.columnId === cellKey.columnId;

              const isEditing =
                editingCell?.rowId === cellKey.rowId &&
                editingCell?.columnId === cellKey.columnId;

              return (
                <CellRenderer
                  key={cell.id}
                  cell={cell}
                  isSelected={isSelected}
                  isEditing={isEditing}
                  setSelectedCell={setSelectedCell}
                  setEditingCell={setEditingCell}
                  updateCell={updateCell}
                  getNextCellKey={getNextCellKey}
                  searchTerm={searchTerm}
                  style={{
                    position: "absolute",
                    top: vr.start + 40,
                    left: vc.start + 40,
                    width: vc.size,
                    height: vr.size,
                    backgroundColor: filteredColumnIds.includes(col.id)
                      ? "#d1fae5" // green-100 for filtered columns
                      : sortedColumnIds.includes(col.id)
                      ? "#FFEFE6" // Light peach color for sorted columns
                      : undefined,
                  }}
                />
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
};
