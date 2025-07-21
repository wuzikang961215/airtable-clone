"use client";

import { EditableTable } from "./EditableTable";
import { useTableData } from "~/hooks/useTableData";
import { ViewSelector } from "./ViewSelector";
import { useState } from "react";

type Props = {
  tableId: string;
  viewId?: string; // ✅ Support optional viewId
};

export const TableView = ({ tableId }: Props) => {
  const [views, setViews] = useState([
    { id: "view-1", name: "Grid view", type: "Grid" },
    { id: "view-2", name: "Grid 2", type: "Grid" },
  ]);
  const [activeViewId, setActiveViewId] = useState("view-1");

  const {
    rowsById,
    columns,
    viewConfig,
    loading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    updateCell,
    addRow,
    addColumn,
  } = useTableData(tableId, activeViewId);

  const isReady =
    !loading &&
    columns &&
    columns.length > 0 &&
    rowsById &&
    Object.keys(rowsById).length > 0;

  const rows = Object.values(rowsById);

  return (
    <div className="flex h-full">
      <ViewSelector
        tableId={tableId}
        views={views}
        currentViewId={activeViewId}
        onViewChange={(id) => setActiveViewId(id)}
        onCreateView={(newView) => {
          setViews((prev) => [...prev, newView]);
          setActiveViewId(newView.id);
        }}
      />

      <div className="flex-1">
        {isReady ? (
          <EditableTable
            rows={rows}
            columns={columns}
            viewConfig={viewConfig}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            updateCell={updateCell}
            addRow={addRow}
            addColumn={addColumn}
          />
        ) : (
          <div className="p-4 text-gray-500">Loading...</div>
        )}
      </div>
    </div>
  );
};

