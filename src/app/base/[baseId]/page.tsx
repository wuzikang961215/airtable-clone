"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Table,
  LayoutGrid,
  Bell,
  CircleUser,
  Plus,
  ChevronDown,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { api } from "~/trpc/react";
import { TableView } from "~/app/_components/table/TableView";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../../components/ui/dropdown-menu";

export default function BaseTabsPage() {
  const params = useParams();
  const baseId = typeof params.baseId === "string" ? params.baseId : null;

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: base, isLoading: loadingBase } = api.base.getById.useQuery({
    baseId: baseId!,
  });

  const {
    data: tables,
    isLoading: loadingTables,
  } = api.table.getByBase.useQuery({
    baseId: baseId!,
  });

  const createTable = api.table.create.useMutation({
    onSuccess: async () => {
      await utils.table.getByBase.invalidate({ baseId: baseId! });
    },
  });

  const deleteTable = api.table.delete.useMutation({
    onSuccess: async () => {
      await utils.table.getByBase.invalidate({ baseId: baseId! });
      setSelectedTableId(null);
    },
  });

  const handleAddTable = async () => {
    const name = prompt("Enter new table name:");
    if (name && baseId) {
      const newTable = await createTable.mutateAsync({ baseId, name });
      setSelectedTableId(newTable.id);
    }
  };

  if (!baseId || loadingBase || loadingTables || !base || !tables) {
    return <p className="p-6 text-gray-500">Loading...</p>;
  }

  const activeTableId = selectedTableId ?? tables[0]?.id;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-16 bg-white border-r flex flex-col items-center py-4 space-y-6">
        <Table className="text-gray-600" />
        <LayoutGrid className="text-gray-400" />
        <CircleUser className="text-gray-400" />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <div className="border-b px-6 py-2 bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">{base.name}</h2>
            <Button variant="ghost" size="sm">
              + Add or import
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Bell className="text-gray-400 w-4 h-4" />
            <div className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-white text-sm">
              T
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="bg-[#ffeee5] px-6 pt-2 pb-1 border-b">
          <div className="flex gap-2 items-center">
            {tables.map((t) => {
              const isActive = activeTableId === t.id;
              return (
                <div key={t.id}>
                  {isActive ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center px-4 py-1 text-sm bg-white text-[#993f3a] rounded-md border border-[#e6bdb1] hover:bg-[#fff6f3] transition"
                        >
                          {t.name}
                          <ChevronDown className="w-4 h-4 ml-2 text-[#993f3a]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48">
                        <DropdownMenuItem>Rename table</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDeletingId(t.id);
                            deleteTable.mutate(
                              { tableId: t.id },
                              {
                                onSettled: () => setDeletingId(null),
                              }
                            );
                          }}
                          disabled={deletingId === t.id}
                          className="text-red-500"
                        >
                          {deletingId === t.id ? "Deleting..." : "Delete table"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button
                      key={t.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTableId(t.id)}
                      className="rounded-md px-4 py-1 text-sm text-[#b35c4e] hover:bg-[#ffd7c4]"
                    >
                      {t.name}
                    </Button>
                  )}
                </div>
              );
            })}

            {/* ➕ Add Table */}
            <Button
              variant="ghost"
              size="icon"
              className="text-[#b35c4e] hover:bg-[#ffd7c4]"
              onClick={handleAddTable}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Grid Controls */}
        <div className="px-6 py-2 flex items-center justify-between text-sm border-b bg-gray-50">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <Button variant="ghost" size="sm">
              Hide fields
            </Button>
            <Button variant="ghost" size="sm">
              Filter
            </Button>
            <Button variant="ghost" size="sm">
              Group
            </Button>
            <Button variant="ghost" size="sm">
              Sort
            </Button>
            <Button variant="ghost" size="sm">
              Color
            </Button>
            <Button variant="ghost" size="sm">
              Share and sync
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex flex-1 bg-white overflow-hidden">

          {/* Active table view */}
          <div className="flex-1 overflow-auto">
            {tables.map((t) => (
              <div key={t.id} className={activeTableId === t.id ? "block" : "hidden"}>
                <TableView tableId={t.id} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
