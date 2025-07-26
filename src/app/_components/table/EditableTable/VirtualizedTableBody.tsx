import React from "react";
import type { Row, Column } from "@tanstack/react-table";
import type { VirtualItem } from "@tanstack/react-virtual";
import { RowHeader } from "./RowHeader";
import { CellRenderer } from "./CellRenderer";

type CellKey = { rowId: string; columnId: string };

type Props = {
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
  _addRow: () => void;
  _bulkAddRows: (count: number) => Promise<{ success: boolean; count: number }>;
  _isBulkInserting: boolean;
  _bulkInsertProgress?: { current: number; total: number; tableId: string } | null;
  searchTerm: string;
  _view?: {
    sorts?: { columnId: string; direction: "asc" | "desc" }[];
  } | null;
  sorts?: { columnId: string; direction: string }[];
  filters?: { columnId: string; operator: string; value?: string | number }[];
};

export const VirtualizedTableBody = ({
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
  _addRow,
  _bulkAddRows,
  _isBulkInserting,
  _bulkInsertProgress,
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
        height: rowVirtualizer.getTotalSize(),
        position: "relative",
      }}
    >
      {/* Headers are now rendered in EditableTable as sticky elements */}

      {vRows.map((vr) => {
        const isBottomRow = vr.index === tableRows.length;
        const row = tableRows[vr.index];

        return (
          <React.Fragment key={vr.key}>
            <RowHeader
              top={vr.start}
              height={vr.size}
              rowIndex={vr.index}
              isBottomRow={isBottomRow}
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
                    top: vr.start,
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
