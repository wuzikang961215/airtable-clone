"use client";

import { useState } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "~/components/ui/dropdown-menu";
import { Plus, Loader2, Type, Hash } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";


type Props = {
  onAddColumn: (name: string, type: "text" | "number") => void;
  isLoading?: boolean;
};

export const AddColumnForm = ({ onAddColumn, isLoading = false }: Props) => {
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<"text" | "number">("text");
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!newColName) return;
    onAddColumn(newColName, newColType);
    setNewColName("");
    setNewColType("text");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newColName) {
      handleAdd();
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center justify-center w-full h-full">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 p-0" align="start">
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold mb-3">Add field</h3>
            <Input 
              placeholder="Field name"
              value={newColName} 
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoFocus
              className="text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">FIELD TYPE</p>
            <div className="space-y-1">
              <button
                onClick={() => setNewColType("text")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  newColType === "text" 
                    ? "bg-blue-50 text-blue-700 border border-blue-200" 
                    : "hover:bg-gray-50"
                }`}
                disabled={isLoading}
              >
                <Type className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">Single line text</div>
                  <div className="text-xs text-gray-500">A single line of text</div>
                </div>
              </button>
              
              <button
                onClick={() => setNewColType("number")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  newColType === "number" 
                    ? "bg-blue-50 text-blue-700 border border-blue-200" 
                    : "hover:bg-gray-50"
                }`}
                disabled={isLoading}
              >
                <Hash className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">Number</div>
                  <div className="text-xs text-gray-500">Integer or decimal</div>
                </div>
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={handleAdd} 
              disabled={!newColName || isLoading}
              className="flex-1 bg-[#2D7FF9] hover:bg-[#2368C4] text-white"
            >
              {isLoading ? "Creating..." : "Create field"}
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
