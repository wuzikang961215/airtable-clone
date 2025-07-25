import React from "react";
import { AddRowDropdown } from "../AddRowDropdown";

type Props = {
  top: number;
  height: number;
  rowIndex: number;
  isBottomRow: boolean;
  addRow: () => void;
  bulkAddRows: (count: number) => Promise<{ success: boolean; count: number }>;
  isBulkInserting: boolean;
};

export const RowHeader = ({
  top,
  height,
  rowIndex,
  isBottomRow,
  addRow,
  bulkAddRows,
  isBulkInserting,
}: Props) => {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        width: 40,
        height,
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
          onAddRows={async (count) => {
            if (count === 1) {
              addRow();
            } else {
              await bulkAddRows(count);
            }
          }}
          isLoading={isBulkInserting}
        />
      ) : (
        rowIndex + 1
      )}
    </div>
  );
};
