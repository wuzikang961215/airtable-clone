"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Table, LayoutGrid, Bell, CircleUser, Plus } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { api } from "~/trpc/react";
import { TableView } from "~/app/_components/TableView";

export default function BaseTabsPage() {
  const params = useParams();
  const baseId = typeof params.baseId === "string" ? params.baseId : null;

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

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

        {/* Tab Bar with Custom Peach Color */}
        <div className="bg-[#ffeee5] px-6 pt-2 pb-1 border-b">
          <div className="flex gap-2 items-center">
            {tables.map((t) => (
              <Button
                key={t.id}
                variant={activeTableId === t.id ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full px-4 py-1 text-sm ${
                  activeTableId === t.id
                    ? "bg-white text-[#993f3a]"
                    : "text-[#b35c4e] hover:bg-[#ffd7c4]"
                }`}
                onClick={() => setSelectedTableId(t.id)}
              >
                {t.name}
              </Button>
            ))}

            {/* ➕ Button right after the last tab */}
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              + Create new...
            </Button>
            <Input type="text" placeholder="Find a view" className="h-7 w-40 text-sm" />
            <Button variant="secondary" size="sm">
              Grid view
            </Button>
          </div>
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
        <div className="flex-1 bg-white overflow-auto px-6 py-4 text-sm">
          {tables.map((t) => (
            <div key={t.id} className={activeTableId === t.id ? "block" : "hidden"}>
              <TableView tableId={t.id} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
