"use client";

import { useState } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@radix-ui/react-dropdown-menu";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";
import { Label } from "~/components/ui/label";


type Props = {
  onAddColumn: (name: string, type: "text" | "number") => void;
  isLoading?: boolean;
};

export const AddColumnForm = ({ onAddColumn, isLoading = false }: Props) => {
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<"text" | "number" | "">("");

  const handleAdd = () => {
    if (!newColName || !newColType) return;
    onAddColumn(newColName, newColType);
    setNewColName("");
    setNewColType("");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 text-gray-400 cursor-pointer" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-4 w-64 space-y-2 bg-white shadow-md rounded-md border">
        <Label>Column Name</Label>
        <Input 
          value={newColName} 
          onChange={(e) => setNewColName(e.target.value)} 
          disabled={isLoading}
        />
        <Label>Column Type</Label>
        <Select
          value={newColType}
          onValueChange={(v) => setNewColType(v as "text" | "number")}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="number">Number</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} disabled={isLoading}>
          {isLoading ? "Adding..." : "Add Column"}
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
