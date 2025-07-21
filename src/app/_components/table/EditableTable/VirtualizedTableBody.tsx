import React, { useEffect, useRef } from "react";
import type { Row, Column, Table } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { CellEditor } from "../CellEditor";
import { AddColumnForm } from "../AddColumnForm";
import type { VirtualItem } from "@tanstack/react-virtual";
import { RowHeader } from "./RowHeader";

type CellKey = { rowId: string; columnId: string };

type Props = {
  table: Table<{id: string; [key: string]: string;}>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  tableRows: Row<{ id: string; [key: string]: string }>[];
  visibleColumns: Column<{ id: string; [key: string]: string }, unknown>[];
  vRows: VirtualItem[];
  vCols: VirtualItem[];
  updateCell: (rowId: string, columnId: string, value: string) => void;
  editingCell: CellKey | null;
  selectedCell: CellKey | null;
  setSelectedCell: (cell: CellKey) => void;
  setEditingCell: (cell: CellKey | null) => void;
  addRow: () => void;
  addColumn: (name: string, type: "text" | "number") => void;
};

const VirtualCell = ({
  isSelected,
  isEditing,
  cellKey,
  cellValue,
  updateCell,
  setSelectedCell,
  setEditingCell,
  getNextCellKey,
  style,
}: {
  isSelected: boolean;
  isEditing: boolean;
  cellKey: CellKey;
  cellValue: unknown;
  updateCell: (rowId: string, columnId: string, value: string) => void;
  setSelectedCell: (cell: CellKey) => void;
  setEditingCell: (cell: CellKey | null) => void;
  getNextCellKey: (key: CellKey, dir: "right" | "left" | "down" | "up") => CellKey | null;
  style: React.CSSProperties;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected) ref.current?.focus();
  }, [isSelected]);

  return (
    <div
      ref={ref}
      tabIndex={0}
      onFocus={() => setSelectedCell(cellKey)}
      onClick={() => setSelectedCell(cellKey)}
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
      style={style}
      title={typeof cellValue === "string" || typeof cellValue === "number" ? String(cellValue) : undefined}
    >
      {isEditing ? (
        <CellEditor
          value={typeof cellValue === "string" || typeof cellValue === "number" ? String(cellValue) : ""}
          onChange={(newVal) => {
            if (newVal !== cellValue) {
              updateCell(cellKey.rowId, cellKey.columnId, newVal);
            }
          }}
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

export const VirtualizedTableBody = ({
  table,
  containerRef,
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
      {/* Top-left corner cell */}
      <div className="absolute top-0 left-0 w-10 h-10 bg-gray-50 border-r border-b flex items-center justify-center font-bold z-10">
        #
      </div>

      {/* Render actual headers using TanStack HeaderGroups */}
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
                header && flexRender(header.column.columnDef.header, header.getContext())
                )}
            </div>
            );
        })
        )}


      {/* Render table rows and cells */}
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
                <VirtualCell
                  key={cell.id}
                  isSelected={isSelected}
                  isEditing={isEditing}
                  cellKey={cellKey}
                  cellValue={cellValue}
                  updateCell={updateCell}
                  setSelectedCell={setSelectedCell}
                  setEditingCell={setEditingCell}
                  getNextCellKey={getNextCellKey}
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
                    outline: "none",
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
