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

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (!virtualItems.length) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (
      lastItem &&
      lastItem.index >= rows.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [virtualItems, rows.length, hasNextPage, isFetchingNextPage]);

  if (loadingColumns || loadingRows) {
    return <p className="p-4 text-gray-500">Loading...</p>;
  }

  if (errorColumns || errorRows || !columns) {
    return <p className="p-4 text-red-500">Failed to load data.</p>;
  }

  return (
    <div className="overflow-auto border border-gray-300 rounded max-h-[80vh]">
      <table className="min-w-full table-fixed text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                className="px-4 py-2 border-b border-r border-gray-300 last:border-r-0 text-left font-semibold text-gray-700 bg-white"
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
          {virtualItems.map((virtualRow) => {
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
                        if (!row) {
                          return (
                            <td
                              key={col.id}
                              className="px-4 py-2 border-b border-r border-gray-300 last:border-r-0 text-gray-400 italic"
                            >
                              Loading...
                            </td>
                          );
                        }

                        const cell = row.cells.find(
                          (c) => c.columnId === col.id
                        );

                        return (
                          <td
                            key={col.id}
                            className="px-4 py-2 border-b border-r border-gray-300 last:border-r-0"
                          >
                            {cell?.value ?? ""}
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
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm text-gray-500">
            Loading more...
          </div>
        )}
      </div>
    </div>
  );
};
