"use client";

import { Plus, Loader2 } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent 
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";

type Props = {
  onAddRows: (count: number) => void | Promise<void>;
  isLoading?: boolean;
  isFooter?: boolean;
  progress?: { current: number; total: number } | null;
};

export const AddRowDropdown = ({ onAddRows, isLoading = false, isFooter = false }: Props) => {
  // Show detailed progress info
  // const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;
  // const formatNumber = (num: number) => num.toLocaleString();
  
  if (isFooter) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full h-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
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
            onClick={() => onAddRows(100)}
            disabled={isLoading}
          >
            📊 Add 100 Rows
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => onAddRows(5000)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding rows...
              </>
            ) : (
              "📈 Add 5k Rows"
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => onAddRows(100000)}
            disabled={isLoading}
          >
            🚀 Add 100k Rows
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 text-gray-500 cursor-pointer" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
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
          onClick={() => onAddRows(100)}
          disabled={isLoading}
        >
          📊 Add 100 Rows
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => onAddRows(5000)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding rows...
            </>
          ) : (
            "📈 Add 5k Rows"
          )}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => onAddRows(100000)}
          disabled={isLoading}
        >
          🚀 Add 100k Rows
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
