"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import debounce from "lodash.debounce";
import {
  Table,
  LayoutGrid,
  Bell,
  CircleUser,
  Plus,
  ChevronDown,
  X,
  ArrowUpDown,
  EyeOff,
  Filter as FilterIcon,
  Layers,
  Palette,
  Share2,
  Search,
  Loader2,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { api } from "~/trpc/react";
import { TableView } from "~/app/_components/table/TableView";
import { CreateTableModal } from "~/app/_components/CreateTableModal";
import type { Sort, Filter } from "~/hooks/useTableData";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

export default function BaseTabsPage() {
  const params = useParams();
  const baseId = typeof params.baseId === "string" ? params.baseId : null;

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [activeViewName, setActiveViewName] = useState("Grid view");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterColumn, setFilterColumn] = useState<string>("");
  const [filterOperator, setFilterOperator] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");
  const [createTableModalOpen, setCreateTableModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const utils = api.useUtils();
  const updateView = api.view.updateConfig.useMutation();
  const [tempHiddenColumns, setTempHiddenColumns] = useState<string[]>([]);
  const [hideFieldsOpen, setHideFieldsOpen] = useState(false);

  const { data: base, isLoading: loadingBase } = api.base.getById.useQuery({
    baseId: baseId!,
  });

  const { data: tables, isLoading: loadingTables } = api.table.getByBase.useQuery({
    baseId: baseId!,
  });

  const activeTableId = selectedTableId ?? tables?.[0]?.id ?? null;

  const { data: _views = [] } = api.view.getByTable.useQuery(
    { tableId: activeTableId ?? "" },
    { enabled: !!activeTableId }
  );

  const { data: view } = api.view.getById.useQuery(
    { viewId: activeViewId! },
    { enabled: !!activeViewId }
  );

  const { data: columns = [] } = api.column.getByTable.useQuery(
    { tableId: activeTableId ?? "" },
    { enabled: !!activeTableId }
  );

  useEffect(() => {
    const firstTable = tables?.[0];
    if (!selectedTableId && firstTable) {
      setSelectedTableId(firstTable.id);
    }
  }, [tables, selectedTableId]);

  // Reset activeViewId when switching tables
  useEffect(() => {
    if (selectedTableId) {
      setActiveViewId(null);
      setActiveViewName("Grid view");
    }
  }, [selectedTableId]);

  // Don't initialize tempHiddenColumns here - it will be set when dropdown opens

  useEffect(() => {
    setSearchTerm("");
    // Reset hide fields dropdown state when switching views
    setHideFieldsOpen(false);
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

  const handleAddTable = () => {
    setCreateTableModalOpen(true);
  };

  const handleCreateTable = async (data: { name: string; description?: string }) => {
    if (baseId) {
      const newTable = await createTable.mutateAsync({ baseId, name: data.name });
      
      // Clear any filters/sorts from previous table
      setSearchTerm("");
      setFilterColumn("");
      setFilterOperator("");
      setFilterValue("");
      
      // Reset view state to ensure the new table loads with its default view
      setActiveViewId(null);
      setActiveViewName("Grid view");
      
      // Switch to the new table - this will trigger the useEffect to reset activeViewId
      setSelectedTableId(newTable.id);
      setCreateTableModalOpen(false);
      
      // Invalidate views query to ensure fresh data for the new table
      await utils.view.getByTable.invalidate({ tableId: newTable.id });
    }
  };

  const handleAddSort = (colId: string) => {
    if (!activeViewId || !view) return;

    const currentSorts = (view.sorts ?? []) as Sort[];
    const currentSort = currentSorts[0]; // Only consider first sort for single-sort

    let newSorts: Sort[] = [];
    if (currentSort && currentSort.columnId === colId) {
      // Same column clicked - cycle through: asc -> desc -> none
      if (currentSort.direction === "asc") {
        newSorts = [{ ...currentSort, direction: "desc" as const }];
      } else {
        newSorts = []; // Remove sort
      }
    } else {
      // Different column clicked - replace current sort
      const column = columns.find(c => c.id === colId);
      const columnType = (column?.type as "text" | "number") ?? "text";
      newSorts = [{ columnId: colId, columnType, direction: "asc" as const }];
    }

    updateView.mutate(
      { viewId: activeViewId, sorts: newSorts },
      {
        onSuccess: () => {
          void utils.view.getById.invalidate({ viewId: activeViewId });
          // Remove cached data when sorts change to ensure fresh pagination
          utils.row.getByTable.setInfiniteData({ tableId: activeTableId! }, undefined);
          void utils.row.getByTable.invalidate({ 
            tableId: activeTableId!
          });
        },
      }
    );
  };

  const handleAddFilter = (columnId: string, operator: string, value: string) => {
    if (!activeViewId || !view) return;

    const column = columns.find(c => c.id === columnId);
    const columnType = (column?.type as "text" | "number") ?? "text";
    
    let filterValue: string | number = value;
    if (columnType === "number") {
      const numericValue = parseFloat(value);
      filterValue = isNaN(numericValue) ? 0 : numericValue;
    }

    const newFilter = columnType === "text" 
      ? {
          columnId,
          columnType: "text" as const,
          operator: operator as "contains" | "equals" | "not_contains" | "is_empty" | "is_not_empty",
          value: filterValue as string,
        }
      : {
          columnId,
          columnType: "number" as const,
          operator: operator as "equals" | "greater_than" | "less_than" | "greater_equal" | "less_equal" | "is_empty" | "is_not_empty",
          value: filterValue as number,
        };

    updateView.mutate(
      { viewId: activeViewId, filters: [newFilter] },
      {
        onSuccess: () => {
          void utils.view.getById.invalidate({ viewId: activeViewId });
          void utils.row.getByTable.invalidate({ tableId: activeTableId! });
        },
      }
    );
  };

  const handleRemoveFilter = () => {
    if (!activeViewId) return;

    updateView.mutate(
      { viewId: activeViewId, filters: [] },
      {
        onSuccess: () => {
          void utils.view.getById.invalidate({ viewId: activeViewId });
          void utils.row.getByTable.invalidate({ tableId: activeTableId! });
        },
      }
    );
  };

  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      if (!activeViewId) return;
      updateView.mutate(
        { 
          viewId: activeViewId,
          searchTerm: term 
        },
        {
          onSuccess: () => {
            void utils.view.getById.invalidate({ viewId: activeViewId });
            void utils.row.getByTable.invalidate({ tableId: activeTableId! });
          },
        }
      );
    }, 300),
    [activeViewId, activeTableId, updateView, utils.view.getById, utils.row.getByTable]
  );


  if (!baseId || loadingBase || loadingTables || !base || !tables) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-16 bg-white border-r flex flex-col items-center py-4 space-y-6">
        <Table className="text-gray-600" />
        <LayoutGrid className="text-gray-400" />
        <CircleUser className="text-gray-400" />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
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

        {/* Function Bar */}
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
              {/* Hide fields Dropdown */}
              <DropdownMenu open={hideFieldsOpen} onOpenChange={(open) => {
                setHideFieldsOpen(open);
                // When opening, sync temp state with current view state
                if (open) {
                  const currentHidden = Array.isArray(view?.hiddenColumns) ? view.hiddenColumns as string[] : [];
                  setTempHiddenColumns(currentHidden);
                }
              }}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
                    <EyeOff className="w-4 h-4" />
                    Hide fields
                    {view?.hiddenColumns && Array.isArray(view.hiddenColumns) && view.hiddenColumns.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: "#e5e7eb", color: "#4b5563" }}>
                        {view.hiddenColumns.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 p-4" align="start">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Hide fields</h3>
                      <div className="text-xs text-gray-500">
                        {columns.length - tempHiddenColumns.length} of {columns.length} shown
                      </div>
                    </div>

                    {/* Field list */}
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {columns.map((column) => {
                        const isHidden = tempHiddenColumns.includes(column.id);
                        return (
                          <label
                            key={column.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={!isHidden}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTempHiddenColumns(prev => prev.filter(id => id !== column.id));
                                } else {
                                  setTempHiddenColumns(prev => [...prev, column.id]);
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs text-gray-500">
                                {column.type === "number" ? "123" : "Aa"}
                              </span>
                              <span className="text-sm">{column.name}</span>
                            </div>
                            {isHidden && <EyeOff className="h-3 w-3 text-gray-400" />}
                          </label>
                        );
                      })}
                    </div>

                    {/* Quick actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTempHiddenColumns([])}
                        className="text-xs"
                      >
                        Show all
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTempHiddenColumns(columns.map(c => c.id))}
                        className="text-xs"
                      >
                        Hide all
                      </Button>
                    </div>

                    {/* Apply button */}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Reset to current view state
                          const currentHidden = Array.isArray(view?.hiddenColumns) ? view.hiddenColumns as string[] : [];
                          setTempHiddenColumns(currentHidden);
                          setHideFieldsOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!activeViewId) return;
                          updateView.mutate(
                            { viewId: activeViewId, hiddenColumnIds: tempHiddenColumns },
                            {
                              onSuccess: () => {
                                void utils.view.getById.invalidate({ viewId: activeViewId });
                                void utils.view.getByTable.invalidate({ tableId: activeTableId });
                                void utils.row.getByTable.invalidate({ tableId: activeTableId });
                                setHideFieldsOpen(false);
                              },
                            }
                          );
                        }}
                        className="bg-[#2D7FF9] hover:bg-[#2368C4] text-white"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
                    <FilterIcon className="w-4 h-4" />
                    Filter
                    {view?.filters && (view.filters as Filter[]).length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                        {(view.filters as Filter[]).length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 p-4">
                  <div className="space-y-3">
                    {/* Show existing filters */}
                    {view?.filters && (view.filters as Filter[]).length > 0 && (
                      <div className="space-y-2 pb-3 border-b">
                        <div className="text-sm font-medium">Active Filters</div>
                        {(view.filters as Filter[]).map((filter: Filter, index) => {
                          const column = columns.find(c => c.id === filter.columnId);
                          return (
                            <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                              <span>
                                <strong>{column?.name}</strong> {filter.operator.replace(/_/g, ' ')} 
                                {filter.value !== undefined && filter.value !== '' && ` "${filter.value}"`}
                              </span>
                              <button
                                onClick={() => handleRemoveFilter()}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="text-sm font-medium">Add Filter</div>
                    
                    {/* Column Selection */}
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Column</label>
                      <Select value={filterColumn} onValueChange={setFilterColumn}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operator Selection */}
                    {filterColumn && (
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Condition</label>
                        <Select value={filterOperator} onValueChange={setFilterOperator}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const column = columns.find(c => c.id === filterColumn);
                              if (column?.type === "number") {
                                return (
                                  <>
                                    <SelectItem value="equals">Equals</SelectItem>
                                    <SelectItem value="greater_than">Greater than</SelectItem>
                                    <SelectItem value="less_than">Less than</SelectItem>
                                    <SelectItem value="greater_equal">Greater than or equal</SelectItem>
                                    <SelectItem value="less_equal">Less than or equal</SelectItem>
                                    <SelectItem value="is_empty">Is empty</SelectItem>
                                    <SelectItem value="is_not_empty">Is not empty</SelectItem>
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    <SelectItem value="contains">Contains</SelectItem>
                                    <SelectItem value="equals">Equals</SelectItem>
                                    <SelectItem value="not_contains">Does not contain</SelectItem>
                                    <SelectItem value="is_empty">Is empty</SelectItem>
                                    <SelectItem value="is_not_empty">Is not empty</SelectItem>
                                  </>
                                );
                              }
                            })()}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Value Input */}
                    {filterColumn && filterOperator && !["is_empty", "is_not_empty"].includes(filterOperator) && (
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Value</label>
                        <Input
                          value={filterValue}
                          onChange={(e) => setFilterValue(e.target.value)}
                          placeholder="Enter value"
                          className="w-full"
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (filterColumn && filterOperator) {
                            handleAddFilter(filterColumn, filterOperator, filterValue);
                            setFilterColumn("");
                            setFilterOperator("");
                            setFilterValue("");
                          }
                        }}
                        disabled={!filterColumn || !filterOperator}
                        className="bg-[#2D7FF9] hover:bg-[#2368C4] text-white"
                      >
                        Add Filter
                      </Button>
                      
                      {view?.filters && (view.filters as Filter[]).length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handleRemoveFilter();
                            setFilterColumn("");
                            setFilterOperator("");
                            setFilterValue("");
                          }}
                        >
                          Clear Filter
                        </Button>
                      )}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                Group
              </Button>

              {/* Sort Dropdown - Airtable Style */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100">
                    <ArrowUpDown className="h-4 w-4 mr-1" />
                    Sort
                    {view?.sorts && (view.sorts as Sort[]).length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: "#FFEFE6", color: "#c2410c" }}>
                        {(view.sorts as Sort[]).length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-96 p-4" align="start">
                  <div className="space-y-3">
                    {(() => {
                      const viewSorts = view?.sorts as Sort[] | undefined;
                      const firstSort = viewSorts?.[0];
                      
                      return (
                        <>
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Sort by</h3>
                            {viewSorts && viewSorts.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            // Clear sorts directly
                            updateView.mutate(
                              { viewId: activeViewId, sorts: [] },
                              {
                                onSuccess: () => {
                                  void utils.view.getById.invalidate({ viewId: activeViewId });
                                  // Remove all cached data for the row query to force a fresh start
                                  utils.row.getByTable.setInfiniteData({ tableId: activeTableId }, undefined);
                                  void utils.row.getByTable.invalidate({ 
                                    tableId: activeTableId
                                  });
                                },
                              }
                            );
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>

                    {/* Sort Configuration */}
                    <div className="flex gap-2 items-center">
                      {/* Field Selector */}
                      <Select 
                        value={firstSort?.columnId ?? ""} 
                        onValueChange={(value) => {
                          if (value) handleAddSort(value);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Pick a field to sort by">
                            {firstSort && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {columns.find(c => c.id === firstSort.columnId)?.type === "number" ? "123" : "Aa"}
                                </span>
                                {columns.find(c => c.id === firstSort.columnId)?.name}
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {columns
                            .filter(col => !firstSort || firstSort.columnId !== col.id)
                            .map((col) => (
                              <SelectItem key={col.id} value={col.id}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">
                                    {col.type === "number" ? "123" : "Aa"}
                                  </span>
                                  {col.name}
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      {/* Direction Selector */}
                      {firstSort && (
                        <Select
                          value={firstSort.direction}
                          onValueChange={(value) => {
                            // currentSort is same as firstSort in this scope
                            if (firstSort) {
                              updateView.mutate(
                                { 
                                  viewId: activeViewId, 
                                  sorts: [{ ...firstSort, direction: value as "asc" | "desc" }] 
                                },
                                {
                                  onSuccess: () => {
                                    void utils.view.getById.invalidate({ viewId: activeViewId });
                                    // Remove cached data when sort direction changes
                                    utils.row.getByTable.setInfiniteData({ tableId: activeTableId }, undefined);
                                    void utils.row.getByTable.invalidate({ 
                                      tableId: activeTableId
                                    });
                                  },
                                }
                              );
                            }
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              // currentSort is same as firstSort
                              const column = columns.find(c => c.id === firstSort.columnId);
                              if (column?.type === "number") {
                                return (
                                  <>
                                    <SelectItem value="asc">
                                      <span className="flex items-center gap-2">
                                        <span className="text-xs">↑</span> 1 → 9
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="desc">
                                      <span className="flex items-center gap-2">
                                        <span className="text-xs">↓</span> 9 → 1
                                      </span>
                                    </SelectItem>
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    <SelectItem value="asc">
                                      <span className="flex items-center gap-2">
                                        <span className="text-xs">↑</span> A → Z
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="desc">
                                      <span className="flex items-center gap-2">
                                        <span className="text-xs">↓</span> Z → A
                                      </span>
                                    </SelectItem>
                                  </>
                                );
                              }
                            })()}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Current Sort Display */}
                    {firstSort && (
                      <div className="text-xs text-gray-500 pt-1">
                        Sorting by{" "}
                        <span className="font-medium">
                          {columns.find(c => c.id === firstSort.columnId)?.name}
                        </span>{" "}
                        {firstSort.direction === "asc" ? "ascending" : "descending"}
                      </div>
                    )}
                        </>
                      );
                    })()}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
                <Palette className="w-4 h-4" />
                Color
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
                <Share2 className="w-4 h-4" />
                Share and sync
              </Button>

              <DropdownMenu open={searchModalOpen} onOpenChange={setSearchModalOpen}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-600 hover:bg-gray-100"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 p-4" align="end">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Find in view</div>
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchTerm(val);
                        debouncedSearch(val);
                      }}
                      autoFocus
                      className="w-full"
                    />
                    {searchTerm && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Searching for &ldquo;{searchTerm}&rdquo;
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSearchTerm("");
                            debouncedSearch("");
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="flex flex-1 bg-white overflow-hidden">
          {activeTableId && (
            <TableView
                tableId={activeTableId}
                activeViewId={activeViewId}
                onViewChange={(viewId, viewName) => {
                  setActiveViewId(viewId);
                  setActiveViewName(viewName);
                }}
                searchTerm={searchTerm}
                sorts={(view?.sorts as Sort[] | undefined) ?? []}
              />
            )}
        </div>
      </main>

      {/* Create Table Modal */}
      <CreateTableModal
        open={createTableModalOpen}
        onOpenChange={setCreateTableModalOpen}
        onCreateTable={handleCreateTable}
        isCreating={createTable.isPending}
      />
    </div>
  );
}
