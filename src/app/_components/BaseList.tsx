"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export const BaseList = () => {
  const utils = api.useUtils();

  const { data: bases, isLoading } = api.base.getAll.useQuery();
  const createBaseMutation = api.base.create.useMutation({
    onSuccess: () => {
      void utils.base.getAll.invalidate();
    },
  });

  const createBase = createBaseMutation.mutateAsync;
  const isCreating = createBaseMutation.isPending;
  const [name, setName] = useState("");

  const handleCreate = async () => {
    console.log("clicked!");
    const trimmedName = name.trim();
    const finalName = trimmedName || "Untitled Base";
    console.log("Calling createBase with:", finalName);
  
    try {
      await createBase({ name: finalName });
      setName("");
    } catch (err) {
      console.error("Failed to create base", err);
    }
  };  

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">My Bases</h2>

      <div className="mb-6 flex gap-2">
        <input
          className="flex-1 px-4 py-2 rounded border border-gray-300 text-gray-900"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New base name"
        />
        <button
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? "Creating..." : "Create Base"}
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-600">Loading...</p>
      ) : bases && bases.length > 0 ? (
        <div className="space-y-4">
          {bases.map((base) => (
            <BaseItem key={base.id} base={base} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No bases found</p>
      )}
    </div>
  );
};

const BaseItem = ({ base }: { base: { id: string; name: string } }) => {
  const utils = api.useUtils();
  const { data: tables, isLoading } = api.table.getByBase.useQuery({ baseId: base.id });

  const createTableMutation = api.table.create.useMutation({
    onSuccess: () => {
      void utils.table.getByBase.invalidate();
    },
  });

  const handleCreateTable = async () => {
    try {
      console.log("clicked")
      await createTableMutation.mutateAsync({
        baseId: base.id,
        name: `Table ${Math.floor(Math.random() * 1000)}`,
      });
    } catch (err) {
      console.error("Failed to create table", err);
    }
  };

  return (
    <div className="rounded border border-gray-300 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{base.name}</h3>
        <button
          onClick={handleCreateTable}
          className="text-sm text-blue-600 hover:underline"
          disabled={createTableMutation.isPending}
        >
          {createTableMutation.isPending ? "Adding..." : "➕ Add Table"}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading tables...</p>
      ) : tables && tables.length > 0 ? (
        <ul className="ml-2 mt-2 space-y-1">
          {tables.map((table) => (
            <li key={table.id}>
              <Link
                href={`/base/${base.id}/table/${table.id}`}
                className="text-sm text-blue-700 hover:underline"
              >
                {table.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 ml-2 mt-2">No tables yet</p>
      )}
    </div>
  );
};
