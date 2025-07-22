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
  tableRows: Row<{ id: string;[key: string]: string }>[];
  visibleColumns: Column<{ id: string;[key: string]: string }, unknown>[];
  vRows: VirtualItem[];
  vCols: VirtualItem[];
  updateCell: (rowId: string, columnId: string, value: string) => void;
  editingCell: CellKey | null;
  selectedCell: CellKey | null;
  setSelectedCell: (cell: CellKey) => void;
  setEditingCell: (cell: CellKey | null) => void;
  addRow: () => void;
  addColumn: (name: string, type: "text" | "number") => void;
  searchTerm: string;
};

export const VirtualizedTableBody = ({
  table,
  tableRows,
  visibleColumns,
  vRows,
  vCols,
  updateCell,
  editingCell,
  selectedCell,
  setSelectedCell,
  setEditingCell,
  addRow,
  addColumn,
  searchTerm,
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

  return (
    <div
      style={{
        width: (vCols[vCols.length - 1]?.end ?? 0) + 40,
        height: (vRows[vRows.length - 1]?.end ?? 0) + 40,
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

              const cellValue = cell.getValue();

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
