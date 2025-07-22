/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
  currentViewId?: string;
  onViewChange: (viewId: string) => void;
  onCreateView: (view: View) => void;
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
    <div className="w-56 border-r px-4 py-3 bg-gray-50 text-sm flex flex-col space-y-3">
      {/* Create new view */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-start w-full">
            <Plus className="w-4 h-4 mr-2" />
            Create new...
          </Button>
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
      <Input placeholder="Find a view" className="h-8 text-sm" />

      {/* View list */}
      <div className="flex flex-col gap-1">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => onViewChange(v.id)}
            className={`flex items-center px-2 py-1 rounded ${currentViewId === v.id ? "bg-gray-200 font-medium" : "hover:bg-gray-100"
              }`}
          >
            <LayoutGrid className="w-4 h-4 mr-2 text-blue-500" />
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
              disabled={!newViewName || createView.isLoading}
            >
              {createView.isLoading ? "Creating..." : "Create view"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
