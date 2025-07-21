import React from "react";
import { AddRowDropdown } from "../AddRowDropdown";

type Props = {
  top: number;
  height: number;
  rowIndex: number;
  isBottomRow: boolean;
  addRow: () => void;
};

export const RowHeader = ({
  top,
  height,
  rowIndex,
  isBottomRow,
  addRow,
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
          onAddRows={(count) => {
            for (let i = 0; i < count; i++) addRow();
          }}
        />
      ) : (
        rowIndex + 1
      )}
    </div>
  );
};
