import React, { useEffect, useRef } from "react";
import { CellEditor } from "../CellEditor";
import type { Cell } from "@tanstack/react-table";

type CellKey = { rowId: string; columnId: string };

type Props = {
  cell: Cell<{ id: string;[key: string]: string }, unknown>;
  isSelected: boolean;
  isEditing: boolean;
  setSelectedCell: (cell: CellKey) => void;
  setEditingCell: (cell: CellKey | null) => void;
  updateCell: (rowId: string, columnId: string, value: string) => void;
  getNextCellKey: (key: CellKey, dir: "right" | "left" | "down" | "up") => CellKey | null;
  searchTerm?: string;
  style: React.CSSProperties;
};

export const CellRenderer = ({
  cell,
  isSelected,
  isEditing,
  setSelectedCell,
  setEditingCell,
  updateCell,
  getNextCellKey,
  searchTerm = "",
  style,
}: Props) => {
  const cellValue = cell.getValue();
  const cellKey = {
    rowId: (cell.row.original as { id: string }).id,
    columnId: cell.column.id,
  };

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected) ref.current?.focus();
  }, [isSelected]);

  const matchesSearch =
    searchTerm.trim().length > 0 &&
    (typeof cellValue === "string" || typeof cellValue === "number") &&
    String(cellValue).toLowerCase().includes(searchTerm.toLowerCase());

  return (
    <div
      ref={ref}
      tabIndex={0}
      onClick={() => setSelectedCell(cellKey)}
      onFocus={() => setSelectedCell(cellKey)}
      onDoubleClick={() => setEditingCell(cellKey)}
      onKeyDown={(e) => {
        const keyMap: Record<string, "right" | "left" | "down" | "up"> = {
          ArrowRight: "right",
          ArrowLeft: "left",
          ArrowDown: "down",
          ArrowUp: "up",
        };

        if (e.key === "Enter") {
          setEditingCell(cellKey);
          e.preventDefault();
        } else if (e.key === "Tab") {
          const dir = e.shiftKey ? "left" : "right";
          const next = getNextCellKey(cellKey, dir);
          if (next) setSelectedCell(next);
          e.preventDefault();
        } else {
          const direction = keyMap[e.key];
          if (direction) {
            const next = getNextCellKey(cellKey, direction);
            if (next) setSelectedCell(next);
            e.preventDefault();
          }
        }
      }}
      style={{
        ...style,
        padding: "0 8px",
        borderRight: "1px solid #eee",
        borderBottom: "1px solid #eee",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        border: isSelected ? "2px solid #3b82f6" : "1px solid #eee",
        outline: "none",
        background: matchesSearch ? "#FEF3C7" : "white", // yellow-100 if matched
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
          {typeof cellValue === "string" || typeof cellValue === "number"
            ? String(cellValue)
            : ""}
        </span>
      )}
    </div>
  );
};
