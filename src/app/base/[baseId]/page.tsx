"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "~/trpc/react";
import { TableView } from "~/app/_components/TableView";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../../components/ui/tabs";

export default function BaseTabsPage() {
  const params = useParams();
  const baseId = typeof params.baseId === "string" ? params.baseId : null;

  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // 👇 提前 return，避免 baseId 不合法时继续调用 Hook
  if (!baseId) {
    return <p className="p-6 text-red-500">Invalid baseId</p>;
  }

  const {
    data: tables,
    isLoading,
    isError,
  } = api.table.getByBase.useQuery({ baseId });

  if (isLoading) {
    return <p className="p-6 text-gray-500">Loading tables...</p>;
  }

  if (isError || !tables) {
    return <p className="p-6 text-red-500">Failed to load tables</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Tables in this Base</h1>

      <Tabs
        value={selectedTable ?? tables[0]?.id}
        onValueChange={(v) => setSelectedTable(v)}
        className="w-full"
      >
        <TabsList className="mb-4">
          {tables.map((table) => (
            <TabsTrigger key={table.id} value={table.id}>
              {table.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {tables.map((table) => (
          <TabsContent key={table.id} value={table.id}>
            <TableView tableId={table.id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
