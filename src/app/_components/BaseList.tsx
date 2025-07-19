"use client";

import { useState } from "react";
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
    if (!name.trim()) return;
    try {
      await createBase({ name });
      setName("");
    } catch (err) {
      console.error("Failed to create base", err);
    }
  };

  return (
    <div className="text-white">
      <h2 className="text-2xl font-bold mb-4">My Bases</h2>

      <div className="mb-4 flex gap-2">
        <input
          className="px-4 py-2 rounded text-black"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New base name"
        />
        <button
          className="bg-green-600 px-4 py-2 rounded"
          onClick={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? "Creating..." : "Create"}
        </button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : bases && bases.length > 0 ? (
        <div className="mt-4">
          {bases.map((base) => (
            <BaseItem key={base.id} base={base} />
          ))}
        </div>
      ) : (
        <p>No bases found</p>
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
      await createTableMutation.mutateAsync({
        baseId: base.id,
        name: `Table ${Math.floor(Math.random() * 1000)}`,
      });
    } catch (err) {
      console.error("Failed to create table", err);
    }
  };

  return (
    <div className="mb-6 border-b border-white/20 pb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">{base.name}</h3>
        <button
          onClick={handleCreateTable}
          className="bg-blue-600 px-3 py-1 rounded text-sm"
          disabled={createTableMutation.isPending}
        >
          {createTableMutation.isPending ? "Adding..." : "➕ Add Table"}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-white/60">Loading tables...</p>
      ) : tables && tables.length > 0 ? (
        <ul className="ml-4 list-disc text-white/90 mt-2">
          {tables.map((table) => (
            <li key={table.id}>{table.name}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/50 mt-2">No tables yet</p>
      )}
    </div>
  );
};
