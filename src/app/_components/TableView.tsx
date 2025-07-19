"use client";

import { api } from "~/trpc/react";

type Props = {
  tableId: string;
};

export const TableView = ({ tableId }: Props) => {
  const { data: columns, isLoading: loadingCols } = api.column.getByTable.useQuery({ tableId });
  const { data: rows, isLoading: loadingRows } = api.row.getByTable.useQuery({ tableId });

  if (loadingCols || loadingRows) {
    return <p className="text-gray-500">Loading table data...</p>;
  }

  if (!columns || !rows) {
    return <p className="text-red-500">Failed to load table</p>;
  }

  return (
    <div className="overflow-auto border border-gray-300 rounded">
      <table className="min-w-full table-auto text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            {columns.map((col) => (
              <th key={col.id} className="px-4 py-2 border-b font-semibold">
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t hover:bg-gray-50">
              {columns.map((col) => {
                const cell = row.cells.find((c) => c.columnId === col.id);
                return (
                  <td key={col.id} className="px-4 py-2 border-b">
                    {cell?.value || ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
