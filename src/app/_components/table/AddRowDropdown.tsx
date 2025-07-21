"use client";

import { Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@radix-ui/react-dropdown-menu";
import { Button } from "~/components/ui/button";

type Props = {
  onAddRows: (count: number) => void;
};

export const AddRowDropdown = ({ onAddRows }: Props) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Plus className="w-4 h-4 text-gray-500 cursor-pointer" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 bg-white border rounded shadow-md">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => onAddRows(1)}
        >
          ➕ Add 1 Row
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => onAddRows(100000)}
        >
          🚀 Add 100k Rows
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
