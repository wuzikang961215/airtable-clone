"use client";

import { EditableTable } from "./EditableTable";
import { useTableData } from "~/hooks/useTableData";

type Props = {
  tableId: string;
  viewId?: string; // ✅ Support optional viewId
};

export const TableView = ({ tableId, viewId }: Props) => {
  const {
    rowsById,
    columns,
    loading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    updateCell,
    addRow,
    addColumn,
  } = useTableData(tableId, viewId); // ✅ pass viewId into the hook

  const isReady =
    !loading &&
    columns &&
    columns.length > 0 &&
    rowsById &&
    Object.keys(rowsById).length > 0;

  if (!isReady) {
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  const rows = Object.values(rowsById);

  return (
    <EditableTable
      rows={rows}
      columns={columns}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      updateCell={updateCell}
      addRow={addRow}
      addColumn={addColumn}
    />
  );
};
