import React from "react";

type Props = {
  top: number;
  height: number;
  rowIndex: number;
  isBottomRow: boolean;
};

export const RowHeader = ({
  top,
  height,
  rowIndex,
  isBottomRow,
}: Props) => {
  return (
    <div
      style={{
        position: "absolute",
        top: top,
        left: 0,
        width: 48,
        height,
        borderBottom: "1px solid #E5E5E5",
        borderRight: "1px solid #E5E5E5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: 400,
        color: "#666666",
        background: "inherit",
        zIndex: 1,
      }}
    >
      {!isBottomRow && (rowIndex + 1)}
    </div>
  );
};
