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
import { Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@radix-ui/react-dropdown-menu";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/ui/select";

type Props = { tableId: string };

type Cell = { columnId: string; value: string };
type Row = { id: string; cells: Cell[] };
type Page = { rows: Row[]; nextCursor?: string };
type Column = { id: string; name: string };

export const TableView = ({ tableId }: Props) => {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; columnId: string } | null>(null);

  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<"text" | "number" | "">("");

  const { data: cols, isLoading: loadingCols } = api.column.getByTable.useQuery({ tableId });
  const updateCell = api.cell.update.useMutation();
  const utils = api.useContext();

  const addColumn = api.column.add.useMutation({
    onSuccess: () => {
      void utils.column.getByTable.invalidate({ tableId });
    },
  });

  const addRow = api.row.add.useMutation({
    onSuccess: () => {
      void utils.row.getByTable.invalidate({ tableId });
    },
  });

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

  useEffect(() => {
    if (!rowPages) return;
    const newData = rowPages.pages.flatMap((p) =>
      (p as Page).rows.map((r) => {
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
      ((cols ?? []) as Column[]).map((c) => ({
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
    count: visibleColumns.length + 1,
    estimateSize: (i) =>
      i === visibleColumns.length ? 40 : visibleColumns[i]?.getSize() ?? 150,
    getScrollElement: () => containerRef.current,
    overscan: 2,
  });

  const rowVirtualizer = useVirtualizer({
    count: rows.length + 1,
    estimateSize: () => 40,
    getScrollElement: () => containerRef.current,
    overscan: 10,
  });

  const vCols = columnVirtualizer.getVirtualItems();
  const vRows = rowVirtualizer.getVirtualItems();

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
          width: columnVirtualizer.getTotalSize() + 40,
          height: rowVirtualizer.getTotalSize() + 40,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 40,
            height: 40,
            background: "#f9fafb",
            borderRight: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            zIndex: 2,
          }}
        >
          #
        </div>

        {table.getHeaderGroups().map((hg) =>
          vCols.map((vc) => {
            const isRightmost = vc.index === visibleColumns.length;
            const header = hg.headers[vc.index];

            return (
              <div
                key={vc.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: vc.start + 40,
                  width: vc.size,
                  height: 40,
                  boxSizing: "border-box",
                  padding: "0 8px",
                  background: "white",
                  fontWeight: "500",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {isRightmost ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Plus className="w-4 h-4 text-gray-400 cursor-pointer" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="p-4 w-64 space-y-2 bg-white shadow-md rounded-md border">
                      <Label>Column Name</Label>
                      <Input
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                      />
                      <Label>Column Type</Label>
                      <Select
                        value={newColType}
                        onValueChange={(v) =>
                          setNewColType(v as "text" | "number")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => {
                          if (!newColName || !newColType) return;
                          addColumn.mutate({
                            tableId,
                            name: newColName,
                            type: newColType,
                          });
                          setNewColName("");
                          setNewColType("");
                        }}
                      >
                        Add Column
                      </Button>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  header && flexRender(header.column.columnDef.header, header.getContext())
                )}
              </div>
            );
          })
        )}

        {vRows.map((vr) => {
          const isBottomRow = vr.index === rows.length;
          const row = rows[vr.index];

          return (
            <React.Fragment key={vr.key}>
              <div
                style={{
                  position: "absolute",
                  top: vr.start + 40,
                  left: 0,
                  width: 40,
                  height: vr.size,
                  borderBottom: "1px solid #eee",
                  borderRight: "1px solid #eee",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "500",
                  background: isBottomRow ? "#f9fafb" : "white",
                }}
              >
                {isBottomRow ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Plus className="w-4 h-4 text-gray-500 cursor-pointer" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 bg-white border rounded shadow-md">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => addRow.mutate({ tableId})}
                      >
                        ➕ Add 1 Row
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => addRow.mutate({ tableId })}
                      >
                        🚀 Add 100k Rows
                      </Button>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  vr.index + 1
                )}
              </div>

              {vCols.map((vc) => {
                const col = visibleColumns[vc.index];
                const isRightmost = vc.index === visibleColumns.length;
                if (!col || isRightmost || isBottomRow) return null;
                if (!row) return null;

                const cell = row.getVisibleCells().find((c) => c.column.id === col.id);
                if (!cell) return null;

                const cellKey = {
                  rowId: row.original.id as string,
                  columnId: cell.column.id,
                };

                const isSelected =
                  selectedCell?.rowId === cellKey.rowId &&
                  selectedCell?.columnId === cellKey.columnId;

                const isEditing =
                  editingCell?.rowId === cellKey.rowId &&
                  editingCell?.columnId === cellKey.columnId;

                const cellValue = cell.getValue();

                return (
                  <div
                    key={cell.id}
                    onClick={() => setSelectedCell(cellKey)}
                    onDoubleClick={() => setEditingCell(cellKey)}
                    style={{
                      position: "absolute",
                      top: vr.start + 40,
                      left: vc.start + 40,
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
                      border: isSelected
                        ? "2px solid #3b82f6"
                        : "1px solid #eee",
                    }}
                    title={
                      typeof cellValue === "string" || typeof cellValue === "number"
                        ? String(cellValue)
                        : undefined
                    }
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        defaultValue={String(cellValue)}
                        className="w-full h-full bg-white border-none outline-none"
                        onBlur={(e) => {
                          const newVal = e.target.value;
                          if (newVal !== cellValue) {
                            setData((prev) =>
                              prev.map((r) =>
                                r.id === cellKey.rowId
                                  ? { ...r, [cellKey.columnId]: newVal }
                                  : r
                              )
                            );
                            updateCell.mutate({
                              rowId: cellKey.rowId,
                              columnId: cellKey.columnId,
                              value: newVal,
                            });
                          }
                          setEditingCell(null);
                        }}
                      />
                    ) : (
                      <span className="truncate block w-full">
                        {cellValue === undefined || cellValue === null ? "" : String(cellValue)}
                      </span>
                    )}
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
