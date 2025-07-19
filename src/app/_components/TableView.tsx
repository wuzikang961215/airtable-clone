"use client";

import { useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { useVirtualizer } from "@tanstack/react-virtual";

type Props = {
  tableId: string;
};

export const TableView = ({ tableId }: Props) => {
  const parentRef = useRef<HTMLDivElement>(null);

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

  const rows = rowPages?.pages.flatMap((p) => p.rows) ?? [];

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? rows.length + 1 : rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  // Only fetch when near end + not already fetching
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (!virtualItems.length) return;
  
    const lastItem = virtualItems[virtualItems.length - 1];
  
    if (
      lastItem &&
      lastItem.index >= rows.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      console.log("Fetching next page...");
      void fetchNextPage();
    }
  }, [rows.length, rowVirtualizer, hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  if (loadingColumns || loadingRows) {
    return <p className="p-4 text-gray-500">Loading...</p>;
  }

  if (errorColumns || errorRows || !columns) {
    return <p className="p-4 text-red-500">Failed to load data.</p>;
  }

  return (
    <div className="overflow-auto border border-gray-300 rounded max-h-[80vh]">
      <table className="min-w-full table-fixed text-sm">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                className="px-4 py-2 border-b text-left font-semibold text-gray-700"
              >
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
      </table>

      <div
        ref={parentRef}
        className="overflow-auto max-h-[70vh]"
        style={{ position: "relative" }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
            width: "100%",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];

            return (
              <div
                key={virtualRow.key}
                ref={rowVirtualizer.measureElement}
                className="absolute top-0 left-0 right-0"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <table className="table-fixed w-full text-sm">
                  <tbody>
                    <tr className="border-t hover:bg-gray-50">
                      {columns.map((col) => {
                        const cell = row?.cells.find(
                          (c) => c.columnId === col.id
                        );
                        return (
                          <td key={col.id} className="px-4 py-2 border-b">
                            {cell?.value ?? (row ? "" : "Loading...")}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
        {isFetchingNextPage && (
          <div className="text-center py-2 text-gray-500">Loading more...</div>
        )}
      </div>
    </div>
  );
};
