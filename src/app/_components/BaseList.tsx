"use client";

import { api } from "~/trpc/react";
import { useState } from "react";

export const BaseList = () => {
  const utils = api.useUtils();

  const { data: bases, isLoading } = api.base.getAll.useQuery();
  const createBaseMutation = api.base.create.useMutation({
    onSuccess: () => {
      void utils.base.getAll.invalidate(); // ✅
    },
  });
  
  const createBase = createBaseMutation.mutateAsync;
  const isCreating = createBaseMutation.isPending; // ✅
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
        <ul className="list-disc list-inside">
          {bases.map((base) => (
            <li key={base.id}>{base.name}</li>
          ))}
        </ul>
      ) : (
        <p>No bases found</p>
      )}
    </div>
  );
};
