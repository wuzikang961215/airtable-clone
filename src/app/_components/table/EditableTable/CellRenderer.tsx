import React from "react";
import { CellEditor } from "../CellEditor";
import type { Cell, Column, Row } from "@tanstack/react-table";

// Extend Row and Column to include virtual layout info
type VirtualRow = Row<Record<string, unknown>> & {
  _virtualStart: number;
  _virtualSize?: number;
};

type VirtualColumn = Column<unknown> & {
  _virtualStart: number;
  _virtualSize?: number;
};

type CellKey = { rowId: string; columnId: string };

type Props = {
  cell: Cell<Record<string, unknown>, unknown>;
  isSelected: boolean;
  isEditing: boolean;
  setSelectedCell: (cell: CellKey) => void;
  setEditingCell: (cell: CellKey | null) => void;
  updateCell: (rowId: string, columnId: string, value: string) => void;
};

export const CellRenderer = ({
  cell,
  isSelected,
  isEditing,
  setSelectedCell,
  setEditingCell,
  updateCell,
}: Props) => {
  const cellValue = cell.getValue();
  const cellKey = {
    rowId: (cell.row.original as { id: string }).id,
    columnId: cell.column.id,
  };

  const row = cell.row as VirtualRow;
  const col = cell.column as VirtualColumn;

  return (
    <div
      key={String(cell.id)}
      onClick={() => setSelectedCell(cellKey)}
      onDoubleClick={() => setEditingCell(cellKey)}
      style={{
        position: "absolute",
        top: row._virtualStart + 40,
        left: col._virtualStart + 40,
        width: col._virtualSize ?? 150,
        height: row._virtualSize ?? 40,
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
        outline: "none",
      }}
      title={
        typeof cellValue === "string" || typeof cellValue === "number"
          ? String(cellValue)
          : undefined
      }
    >
      {isEditing ? (
        <CellEditor
          value={
            typeof cellValue === "string" || typeof cellValue === "number"
              ? String(cellValue)
              : ""
          }
          onChange={(newVal) =>
            updateCell(cellKey.rowId, cellKey.columnId, newVal)
          }
          onBlur={() => setEditingCell(null)}
        />
      ) : (
        <span className="truncate block w-full">
          {typeof cellValue === "string" || typeof cellValue === "number" ? cellValue : ""}
        </span>
      )}
    </div>
  );
};
