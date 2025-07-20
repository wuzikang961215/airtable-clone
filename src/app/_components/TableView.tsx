"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "~/trpc/react";

type Props = { tableId: string };

export const TableView = ({ tableId }: Props) => {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: cols, isLoading: loadingCols } = api.column.getByTable.useQuery({ tableId });

  const {
    data: rowPages,
    isLoading: loadingRows,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = api.row.getByTable.useInfiniteQuery(
    { tableId, limit: 100 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // 整合数据
  useEffect(() => {
    if (!rowPages) return;

    const newData = rowPages.pages.flatMap((p) =>
      p.rows.map((r) => {
        const rec: Record<string, unknown> = { id: r.id };
        for (const c of r.cells) {
          rec[c.columnId] = c.value;
        }
        return rec;
      })
    );

    setData(newData);
  }, [rowPages]);

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      (cols ?? []).map((c) => ({
        accessorKey: c.id,
        header: c.name,
        cell: (info) => info.getValue() as string,
        size: 150,
      })),
    [cols]
  );

  const table = useReactTable<Record<string, unknown>>({
    data,
    columns,
    defaultColumn: { size: 150 },
    getCoreRowModel: getCoreRowModel(),
  });

  const visibleColumns = table.getVisibleLeafColumns();
  const rows = table.getRowModel().rows;

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: visibleColumns.length,
    estimateSize: (i) => visibleColumns[i]?.getSize() ?? 150,
    getScrollElement: () => containerRef.current,
    overscan: 2,
  });

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 40,
    getScrollElement: () => containerRef.current,
    overscan: 10,
  });

  const vCols = columnVirtualizer.getVirtualItems();
  const vRows = rowVirtualizer.getVirtualItems();

  // 自动分页
  useEffect(() => {
    const lastItem = vRows[vRows.length - 1];
    if (
      lastItem &&
      lastItem.index >= rows.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [vRows, rows.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (loadingCols || loadingRows) {
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  return (
    <div
      ref={containerRef}
      className="overflow-auto relative border rounded max-h-[80vh] text-sm"
    >
      <div
        style={{
          width: columnVirtualizer.getTotalSize(),
          height: rowVirtualizer.getTotalSize() + 40,
          position: "relative",
        }}
      >
        {/* Headers */}
        {table.getHeaderGroups().map((hg) =>
          vCols.map((vc) => {
            const header = hg.headers[vc.index];
            if (!header) return null;
            return (
              <div
                key={header.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: vc.start,
                  width: vc.size,
                  height: 40,
                  boxSizing: "border-box",
                  borderBottom: "1px solid #ccc",
                  borderRight: "1px solid #ccc",
                  padding: "0 8px",
                  background: "white",
                  fontWeight: "500",
                  zIndex: 1,
                }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </div>
            );
          })
        )}

        {/* Rows */}
        {vRows.map((vr) => {
          const row = rows[vr.index];
          if (!row) return null;

          return (
            <React.Fragment key={vr.index}>
              {vCols.map((vc) => {
                const cell = row.getVisibleCells()[vc.index];
                if (!cell) return null;

                const cellContent = flexRender(
                  cell.column.columnDef.cell,
                  cell.getContext()
                );

                return (
                  <div
                    key={cell.id}
                    style={{
                      position: "absolute",
                      top: vr.start + 40,
                      left: vc.start,
                      width: vc.size,
                      height: vr.size,
                      padding: "0 8px",
                      borderRight: "1px solid #eee",
                      borderBottom: "1px solid #eee",
                      display: "flex",
                      alignItems: "center",
                      background: "white",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                    title={
                      typeof cellContent === "string" || typeof cellContent === "number"
                        ? String(cellContent)
                        : undefined
                    }
                  >
                    <span className="truncate block w-full">
                      {React.isValidElement(cellContent) ||
                      typeof cellContent === "string" ||
                      typeof cellContent === "number"
                        ? cellContent
                        : null}
                    </span>
                  </div>

                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {isFetchingNextPage && (
        <div className="text-center p-2 text-gray-500">Loading more…</div>
      )}
    </div>
  );
};
