"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "~/trpc/react";
import { EditableTable } from "./EditableTable";
import { useTableData } from "~/hooks/useTableData";
import { ViewSelector } from "./ViewSelector";
import { CompletionToast } from "../CompletionToast";

type TableViewProps = {
  tableId: string;
  activeViewId: string | null;
  onViewChange: (viewId: string, viewName: string) => void;
  searchTerm?: string;
  sorts?: { columnId: string; direction: string }[]; // Pass sorts from parent
};

export const TableView = ({ tableId, activeViewId, onViewChange, searchTerm = "" }: TableViewProps) => {
  const [completionToast, setCompletionToast] = useState<{ message: string; count: number } | null>(null);

  const { data: views = [], isLoading: loadingViews } = api.view.getByTable.useQuery(
    { tableId },
    { enabled: !!tableId }
  );

  const utils = api.useUtils();

  // Initialize activeViewId with first view if none is selected
  useEffect(() => {
    if (!activeViewId && views.length > 0 && views[0]) {
      onViewChange(views[0].id, views[0].name);
    }
  }, [tableId, views, activeViewId, onViewChange]);

  // const _activeView = useMemo(
  //   () => views.find((v) => v.id === activeViewId),
  //   [views, activeViewId]
  // );

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
    bulkAddRows: originalBulkAddRows,
    isBulkInserting,
    bulkInsertProgress,
    otherTableBulkInsert,
    addColumn,
    isAddingColumn,
    columnAddProgress,
  } = useTableData(tableId, activeViewId);
  
  // Wrap bulkAddRows to show completion toast
  const bulkAddRows = useCallback(async (count: number) => {
    const result = await originalBulkAddRows(count);
    if (result.success) {
      setCompletionToast({
        message: `Successfully added ${result.count.toLocaleString()} rows!`,
        count: result.count
      });
    }
    return result;
  }, [originalBulkAddRows]);

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
        onViewChange={(viewId) => {
          const selectedView = views.find(v => v.id === viewId);
          if (selectedView) {
            // Invalidate the view data to ensure fresh column order
            void utils.view.getById.invalidate({ viewId });
            onViewChange(viewId, selectedView.name);
          }
        }}
        onCreateView={(newView: { id: string; name: string }) => {
          void utils.view.getByTable.invalidate({ tableId });
          onViewChange(newView.id, newView.name);
        }}
      />

      <div className="flex-1 relative">
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
            bulkAddRows={bulkAddRows}
            isBulkInserting={isBulkInserting}
            bulkInsertProgress={bulkInsertProgress}
            otherTableBulkInsert={otherTableBulkInsert}
            addColumn={addColumn}
            isAddingColumn={isAddingColumn}
            columnAddProgress={columnAddProgress}
            searchTerm={searchTerm} // ✅ passed directly from props
            sorts={viewConfig?.sorts || []} // Pass sorts for highlighting
            filters={viewConfig?.filters || []} // Pass filters for highlighting
          />
        ) : (
          <div className="p-4 text-gray-500">
            {loading ? "Loading table data..." : "No columns found"}
          </div>
        )}
        
        {/* Progress UI disabled - using completion toast instead */}
        {/* <BulkInsertProgress isInserting={isBulkInserting} progress={bulkInsertProgress} /> */}
        
        {/* Completion toast */}
        {completionToast && (
          <CompletionToast
            message={completionToast.message}
            count={completionToast.count}
            onClose={() => setCompletionToast(null)}
          />
        )}
      </div>
    </div>
  );
};
