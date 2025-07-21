import { useEffect } from "react";

type CellKey = { rowId: string; columnId: string };

type Props = {
  selectedCell: CellKey | null;
  setSelectedCell: (cell: CellKey) => void;
  editingCell: CellKey | null;
  setEditingCell: (cell: CellKey | null) => void;
  columnIdToIndex: Map<string, number>;
  rowIdToIndex: Map<string, number>;
  visibleColumns: { id: string }[];
  rowIdList: string[];
};

export const useCellNavigation = ({
  selectedCell,
  setSelectedCell,
  editingCell,
  setEditingCell,
  columnIdToIndex,
  rowIdToIndex,
  visibleColumns,
  rowIdList,
}: Props) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log("🔑 Key pressed:", e.key);
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || editingCell) return;
      if (!selectedCell) return;

      const colIndex = columnIdToIndex.get(selectedCell.columnId);
      const rowIndex = rowIdToIndex.get(selectedCell.rowId);
      if (colIndex == null || rowIndex == null) return;

      if (e.key === "Tab") {
        e.preventDefault();
        const direction = e.shiftKey ? -1 : 1;

        let nextColIndex = colIndex + direction;
        let nextRowIndex = rowIndex;

        if (nextColIndex >= visibleColumns.length) {
          nextColIndex = 0;
          nextRowIndex++;
        }
        if (nextColIndex < 0) {
          nextColIndex = visibleColumns.length - 1;
          nextRowIndex--;
        }

        if (
          nextRowIndex >= 0 &&
          nextRowIndex < rowIdList.length &&
          nextColIndex >= 0 &&
          nextColIndex < visibleColumns.length
        ) {
          const nextRowId = rowIdList[nextRowIndex];
          const nextCol = visibleColumns[nextColIndex];
          if (nextCol && nextRowId) {
            setSelectedCell({ rowId: nextRowId, columnId: nextCol.id });
          }
        }
      }

      if (e.key === "Enter") {
        setEditingCell({ ...selectedCell });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedCell,
    editingCell,
    columnIdToIndex,
    rowIdToIndex,
    visibleColumns,
    rowIdList,
    setSelectedCell,
    setEditingCell,
  ]);
};
