"use client";

import { Plus, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@radix-ui/react-dropdown-menu";
import { Button } from "~/components/ui/button";

type Props = {
  onAddRows: (count: number) => void | Promise<void>;
  isLoading?: boolean;
};

export const AddRowDropdown = ({ onAddRows, isLoading = false }: Props) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 text-gray-500 cursor-pointer" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 bg-white border rounded shadow-md">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => onAddRows(1)}
          disabled={isLoading}
        >
          ➕ Add 1 Row
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => onAddRows(100000)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding 100k rows...
            </>
          ) : (
            "🚀 Add 100k Rows"
          )}
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
