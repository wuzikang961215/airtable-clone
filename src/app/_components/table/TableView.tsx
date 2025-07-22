"use client";

import { EditableTable } from "./EditableTable";
import { useTableData } from "~/hooks/useTableData";
import { ViewSelector } from "./ViewSelector";
import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";

type Props = {
  tableId: string;
  onActiveViewChange?: (view: { id: string; name: string }) => void;
};

export const TableView = ({ tableId, onActiveViewChange }: Props) => {
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const { data: views = [], isLoading: loadingViews } = api.view.getByTable.useQuery(
    { tableId },
    { enabled: !!tableId }
  );

  useEffect(() => {
    if (views.length > 0 && views[0]?.id) {
      setActiveViewId(views[0].id);
    }
  }, [tableId, views]);

  const activeView = useMemo(
    () => views.find((v) => v.id === activeViewId),
    [views, activeViewId]
  );

  useEffect(() => {
    if (activeView && onActiveViewChange) {
      onActiveViewChange(activeView);
    }
  }, [activeView, onActiveViewChange]);

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
  } = useTableData(tableId, activeViewId ?? "");

  const isReady =
    !loading &&
    columns &&
    columns.length > 0 &&
    rowsById &&
    Object.keys(rowsById).length > 0;

  const rows = Object.values(rowsById);

  const safeViewConfig = useMemo(() => ({
    columnOrder: (viewConfig?.columnOrder ?? []).filter(
      (v): v is string => typeof v === "string"
    ),
    hiddenColumnIds: viewConfig?.hiddenColumnIds ?? [],
  }), [viewConfig]);

  if (!activeViewId || loadingViews) {
    return <div className="p-4 text-gray-500">Loading view...</div>;
  }

  return (
    <div className="flex h-full">
      <ViewSelector
        tableId={tableId}
        views={views}
        currentViewId={activeViewId}
        onViewChange={(id) => setActiveViewId(id)}
        onCreateView={(newView) => {
          setActiveViewId(newView.id);
        }}
      />

      <div className="flex-1">
        {isReady ? (
          <EditableTable
            rows={rows}
            columns={columns}
            viewConfig={safeViewConfig}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            updateCell={updateCell}
            addRow={addRow}
            addColumn={addColumn}
          />
        ) : (
          <div className="p-4 text-gray-500">
            {loading ? "Loading table data..." : "No columns found"}
          </div>
        )}
      </div>
    </div>
  );
};
