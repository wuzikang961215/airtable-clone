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
        width: 40,
        height,
        borderBottom: "1px solid #eee",
        borderRight: "1px solid #eee",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 500,
        background: "white",
        zIndex: 1,
      }}
    >
      {!isBottomRow && (rowIndex + 1)}
    </div>
  );
};
