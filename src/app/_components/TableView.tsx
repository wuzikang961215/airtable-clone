"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

type Props = {
  tableId: string;
};

export const TableView = ({ tableId }: Props) => {
  const { data: columns, isLoading: loadingColumns, isError: errorColumns } =
    api.column.getByTable.useQuery({ tableId });

  const {
    data: rowPages,
    isLoading: loadingRows,
    isError: errorRows,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = api.row.getByTable.useInfiniteQuery(
    {
      tableId,
      limit: 50,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const rows = rowPages?.pages.flatMap((page) => page.rows) ?? [];

  if (loadingColumns || loadingRows) {
    return <p className="text-gray-500 px-4 py-2">Loading table data...</p>;
  }

  if (errorColumns || errorRows || !columns) {
    return (
      <p className="text-red-500 px-4 py-2">
        Failed to load table data. Please try again.
      </p>
    );
  }

  return (
    <div className="overflow-auto border border-gray-300 rounded max-h-[75vh]">
      <table className="min-w-full table-auto text-sm">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                className="px-4 py-2 border-b font-medium text-gray-700"
              >
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-t hover:bg-gray-50 transition-colors"
            >
              {columns.map((col) => {
                const cell = row.cells.find((c) => c.columnId === col.id);
                return (
                  <td key={col.id} className="px-4 py-2 border-b text-gray-800">
                    {cell?.value ?? ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {hasNextPage && (
        <div className="flex justify-center p-4">
          <button
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isFetchingNextPage ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
};
