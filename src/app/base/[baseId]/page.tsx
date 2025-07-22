"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import debounce from "lodash.debounce";
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
import { useRouter } from "next/navigation";

export default function BaseTabsPage() {
  const params = useParams();
  const baseId = typeof params.baseId === "string" ? params.baseId : null;

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [activeViewName, setActiveViewName] = useState("Grid view");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const utils = api.useUtils();
  const updateView = api.view.updateConfig.useMutation();


  const { data: base, isLoading: loadingBase } = api.base.getById.useQuery({
    baseId: baseId!,
  });

  const {
    data: tables,
    isLoading: loadingTables,
  } = api.table.getByBase.useQuery({
    baseId: baseId!,
  });

  const activeTableId = selectedTableId ?? tables?.[0]?.id ?? null;

  const { data: columns = [] } = api.column.getByTable.useQuery(
    { tableId: activeTableId ?? "" },
    { enabled: !!activeTableId }
  );

  useEffect(() => {
    if (!selectedTableId && tables?.length) {
      const table = tables[0]!;
      setSelectedTableId(table.id);
      const view = table.views?.[0];
      if (view) {
        setActiveViewId(view.id);
        setActiveViewName(view.name);
      }
    }
  }, [tables, selectedTableId]);

  useEffect(() => {
    setSearchTerm(""); // 🔁 Reset search input when table or view changes
  }, [selectedTableId, activeViewId]);

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
      setActiveViewName("Grid view");
    }
  };

  const handleAddSort = (colId: string) => {
    if (!activeViewId) return;
    updateView.mutate({
      viewId: activeViewId,
      sorts: [{ columnId: colId, direction: "asc" }],
    });
  };

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      if (!activeViewId) return;
      updateView.mutate(
        {
          viewId: activeViewId,
        },
        {
          onSuccess: () => {
            void utils.view.getById.invalidate({ viewId: activeViewId });
            void utils.row.getByTable.invalidate({
              tableId: activeTableId!,
            });
          },
        }
      );
    }, 300),
    [activeViewId, activeTableId]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    debouncedSearch(val);
  };

  if (!baseId || loadingBase || loadingTables || !base || !tables) {
    return <p className="p-6 text-gray-500">Loading...</p>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-16 bg-white border-r flex flex-col items-center py-4 space-y-6">
        <Table className="text-gray-600" />
        <LayoutGrid className="text-gray-400" />
        <CircleUser className="text-gray-400" />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Navbar */}
        <div className="border-b px-6 py-2 bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">{base.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <Bell className="text-gray-400 w-4 h-4" />
            <div className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-white text-sm">
              T
            </div>
          </div>
        </div>

        {/* Table Tabs */}
        <div className="bg-[#ffeee5] px-6 pt-2 pb-1 border-b">
          <div className="flex gap-2 items-center">
            {tables.map((t) => {
              const isActive = activeTableId === t.id;
              const view = t.views?.[0];
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
                      onClick={() => {
                        setSelectedTableId(t.id);
                        const view = t.views?.[0];
                        if (view) {
                          setActiveViewId(view.id);
                          setActiveViewName(view.name);
                        }
                      }}
                      className="rounded-md px-4 py-1 text-sm text-[#b35c4e] hover:bg-[#ffd7c4]"
                    >
                      {t.name}
                    </Button>
                  )}
                </div>
              );
            })}
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

        {/* Function Bar (Scoped to view + table) */}
        {activeTableId && activeViewId && (
          <div className="px-6 py-2 flex items-center justify-between text-sm border-b bg-white">
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 text-gray-700 font-medium">
                    <LayoutGrid className="w-4 h-4 text-gray-600" />
                    {activeViewName}
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72">
                  <DropdownMenuItem disabled className="flex flex-col items-start gap-1 cursor-default">
                    <span className="text-sm font-medium">👥 Collaborative view</span>
                    <span className="text-xs text-muted-foreground">Editors and up can edit the view configuration</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-sm">➡️ Assign as personal view</DropdownMenuItem>
                  <div className="border-t my-1" />
                  <DropdownMenuItem className="text-sm">✏️ Rename view</DropdownMenuItem>
                  <DropdownMenuItem className="text-sm">ℹ️ Edit view description</DropdownMenuItem>
                  <div className="border-t my-1" />
                  <DropdownMenuItem className="text-sm">📄 Duplicate view</DropdownMenuItem>
                  <DropdownMenuItem className="text-sm">
                    ⚙️ Copy another view&rsquo;s configuration
                  </DropdownMenuItem>
                  <div className="border-t my-1" />
                  <DropdownMenuItem className="text-sm">⬇️ Download CSV</DropdownMenuItem>
                  <DropdownMenuItem className="text-sm">🖨️ Print view</DropdownMenuItem>
                  <div className="border-t my-1" />
                  <DropdownMenuItem className="text-sm text-red-600">🗑️ Delete view</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-700">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100">Hide fields</Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100">Filter</Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100">Group</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100">
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64">
                  <div className="px-3 py-2 text-xs text-muted-foreground font-semibold">Sort by</div>
                  <div className="px-3 py-1">
                    <Input placeholder="Find a field" className="h-7 text-xs" />
                  </div>
                  {columns.map((col) => (
                    <DropdownMenuItem
                      key={col.id}
                      onClick={() => handleAddSort(col.id)}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <span className="text-xs">A</span> {col.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100">Color</Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100">Share and sync</Button>

              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-40 h-8 text-sm placeholder:text-gray-400 bg-gray-100 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="flex flex-1 bg-white overflow-hidden">
          <div className="flex-1 overflow-auto">
            {activeTableId && activeViewId && (
              <TableView
                tableId={activeTableId}
                searchTerm={searchTerm}
                onActiveViewChange={(view) => {
                  setActiveViewName(view.name);
                  setActiveViewId(view.id);
                }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
