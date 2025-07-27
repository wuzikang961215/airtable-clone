"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent 
} from "~/components/ui/dropdown-menu";

type Props = {
  onAddRows: (count: number) => void | Promise<void>;
  isLoading?: boolean;
  isFooter?: boolean;
  progress?: { current: number; total: number } | null;
};

export const AddRowDropdown = ({ onAddRows, isLoading = false, isFooter = false }: Props) => {
  const [open, setOpen] = useState(false);
  // Show detailed progress info
  // const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;
  // const formatNumber = (num: number) => num.toLocaleString();
  
  const handleAddRows = (count: number) => {
    void onAddRows(count);
    setOpen(false); // Close dropdown after action
  };

  if (isFooter) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button className="w-full h-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 p-1">
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            onClick={() => handleAddRows(1)}
            disabled={isLoading}
          >
            Add 1 row
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            onClick={() => handleAddRows(100)}
            disabled={isLoading}
          >
            Add 100 rows
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            onClick={() => handleAddRows(5000)}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding rows...
              </span>
            ) : (
              "Add 5,000 rows"
            )}
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            onClick={() => handleAddRows(100000)}
            disabled={isLoading}
          >
            Add 100,000 rows
          </button>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 text-gray-500 cursor-pointer" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 p-1">
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          onClick={() => handleAddRows(1)}
          disabled={isLoading}
        >
          Add 1 row
        </button>
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          onClick={() => handleAddRows(100)}
          disabled={isLoading}
        >
          Add 100 rows
        </button>
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          onClick={() => handleAddRows(5000)}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding rows...
            </span>
          ) : (
            "Add 5,000 rows"
          )}
        </button>
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          onClick={() => handleAddRows(100000)}
          disabled={isLoading}
        >
          Add 100,000 rows
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
