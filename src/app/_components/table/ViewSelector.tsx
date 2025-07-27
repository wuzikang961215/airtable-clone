
"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  LayoutGrid,
  Plus,
  Calendar,
  KanbanSquare,
  List,
  Lock,
  Users,
  User,
  Search,
} from "lucide-react";
import { api } from "~/trpc/react";
import type { inferProcedureInput, inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import type { UseMutationResult } from "@tanstack/react-query";
import type { TRPCClientError } from "@trpc/client";

// ─── Types ─────────────────────────────────────────────
type CreateViewInput = inferProcedureInput<AppRouter["view"]["create"]>;
type CreateViewOutput = inferProcedureOutput<AppRouter["view"]["create"]>;

const VIEW_TYPES = [
  { label: "Grid", icon: LayoutGrid },
  { label: "Calendar", icon: Calendar },
  { label: "Kanban", icon: KanbanSquare },
  { label: "List", icon: List },
];

const VIEW_PERMISSIONS = [
  { label: "Collaborative", icon: Users },
  { label: "Personal", icon: User },
  { label: "Locked", icon: Lock },
];

type View = {
  id: string;
  name: string;
  type: string;
};

type Props = {
  tableId: string;
  views: View[];
  currentViewId?: string | null;
  onViewChange: (viewId: string) => void;
  onCreateView: (view: { id: string; name: string }) => void;
};

export function ViewSelector({
  tableId,
  views,
  currentViewId,
  onViewChange,
  onCreateView,
}: Props) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [selectedType, setSelectedType] = useState("Grid");
  const [selectedPermission, setSelectedPermission] = useState("Collaborative");


  const createView = (api.view.create.useMutation() as unknown) as UseMutationResult<
    CreateViewOutput,
    TRPCClientError<AppRouter>,
    CreateViewInput,
    unknown
  >;

  return (
    <div className="w-56 border-r border-[#E1E1E1] px-3 py-3 bg-[#FAFAFA] text-sm flex flex-col space-y-2">
      {/* Create new view */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center px-2 py-1.5 rounded text-[13px] transition-colors hover:bg-[#F0F0F0] text-[#333333] w-full text-left">
            <Plus className="w-3.5 h-3.5 mr-2 text-[#666666]" />
            Create...
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          {VIEW_TYPES.map(({ label, icon: Icon }) => (
            <DropdownMenuItem
              key={label}
              onClick={() => {
                setSelectedType(label);
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666666]" />
        <Input 
          placeholder="Find a view" 
          className="h-7 text-[12px] border-[#D0D0D0] focus:border-[#2D7FF9] pl-7" 
        />
      </div>

      {/* View list */}
      <div className="flex flex-col gap-0.5">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => onViewChange(v.id)}
            className={`flex items-center px-2 py-1.5 rounded text-[13px] transition-colors ${
              currentViewId === v.id 
                ? "bg-[#E8F2FF] font-medium text-[#2D7FF9]" 
                : "hover:bg-[#F0F0F0] text-[#333333]"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-2" style={{ color: currentViewId === v.id ? '#2D7FF9' : '#666666' }} />
            {v.name}
          </button>
        ))}
      </div>

      {/* Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create {selectedType} View</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Name this view"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
          />

          <div className="flex gap-2">
            {VIEW_PERMISSIONS.map(({ label, icon: Icon }) => (
              <Button
                key={label}
                variant={selectedPermission === label ? "secondary" : "outline"}
                onClick={() => setSelectedPermission(label)}
                className="flex-1 justify-start"
              >
                <Icon className="w-4 h-4 mr-1" />
                {label}
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                createView.mutate(
                  {
                    tableId,
                    name: newViewName || `${selectedType} view`,
                    type: selectedType,
                  },
                  {
                    onSuccess: (view: CreateViewOutput) => {
                      onCreateView(view);
                      setCreateModalOpen(false);
                      setNewViewName("");
                    },
                    onError: (err: unknown) => {
                      if (err instanceof Error) {
                        console.error("❌ Failed to create view", err.message);
                      } else if (typeof err === "string") {
                        console.error("❌ Failed to create view", err);
                      } else {
                        try {
                          console.error("❌ Failed to create view", JSON.stringify(err));
                        } catch {
                          console.error("❌ Failed to create view", "[Unknown error object]");
                        }
                      }
                    },
                  }
                );
              }}
              disabled={!newViewName || createView.isPending}
              className="bg-[#2D7FF9] hover:bg-[#2368C4] text-white"
            >
              {createView.isPending ? "Creating..." : "Create view"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
