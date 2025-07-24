"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Search,
  Home,
  Star,
  Users,
  Bell,
  HelpCircle,
  Plus,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";

export default function BaseList() {
  const utils = api.useUtils();
  const { data: bases, isLoading } = api.base.getAll.useQuery();

  const createBaseMutation = api.base.create.useMutation({
    onSuccess: () => void utils.base.getAll.invalidate(),
  });

  const createBase = createBaseMutation.mutateAsync;
  const isCreating = createBaseMutation.isPending;
  const [name, setName] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [deletingBaseId, setDeletingBaseId] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = name.trim();
    const finalName = trimmed || "Untitled Base";
    try {
      await createBase({ name: finalName });
      setName("");
      setShowInput(false);
    } catch (err) {
      console.error("Failed to create base", err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      void handleCreate();
    }
  };

  const deleteBase = api.base.delete.useMutation({
    onMutate: ({ baseId }) => {
      setDeletingBaseId(baseId);
    },
    onSettled: () => {
      setDeletingBaseId(null);
      void utils.base.getAll.invalidate();
    },
  });

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r flex flex-col shadow-sm">
        {/* Logo */}
        <div className="px-6 py-4 border-b">
          <h1 className="text-xl font-bold text-gray-900">Airtable</h1>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-gray-100 text-gray-900 font-medium">
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-600 mt-1">
            <Star className="w-4 h-4" />
            <span>Starred</span>
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-600 mt-1">
            <Users className="w-4 h-4" />
            <span>Shared</span>
          </button>
          
          <div className="mt-6">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Workspaces</h3>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-600 mt-2">
              <div className="w-6 h-6 bg-purple-600 rounded-md flex items-center justify-center text-white text-xs font-bold">
                M
              </div>
              <span className="text-sm">My workspace</span>
            </button>
          </div>
        </nav>
        
        {/* Create button at bottom */}
        <div className="p-4 border-t">
          <button
            onClick={() => setShowInput(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Create</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b">
          <div className="w-32"></div> {/* Spacer for alignment */}
          
          {/* Centered search bar */}
          <div className="flex-1 max-w-xl mx-auto px-8">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for a base..."
                className="pl-10 w-full text-sm"
              />
            </div>
          </div>
          
          {/* Right side icons */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <HelpCircle className="h-4 w-4 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bell className="h-4 w-4 text-gray-500" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-white text-sm hover:ring-2 hover:ring-yellow-300">
                  T
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Link href="/api/auth/signout" className="w-full">
                    Sign out
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Welcome banner */}
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center justify-between text-sm mb-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">👋</span>
              <span>
                Welcome to Airtable! Start building your perfect workflow.
              </span>
            </div>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              Dismiss
            </button>
          </div>

          {/* Page title */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Home</h1>

          {/* Top cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 shadow-sm hover:shadow-md cursor-pointer">
            <p className="font-semibold mb-1 text-fuchsia-700">Start with Omni</p>
            <p className="text-sm text-gray-500">
              Use AI to build a custom app tailored to your workflow.
            </p>
          </Card>
          <Card className="p-4 shadow-sm hover:shadow-md cursor-pointer">
            <p className="font-semibold mb-1">Start with templates</p>
            <p className="text-sm text-gray-500">
              Select a template to get started and customize as you go.
            </p>
          </Card>
          <Card className="p-4 shadow-sm hover:shadow-md cursor-pointer">
            <p className="font-semibold mb-1">Quickly upload</p>
            <p className="text-sm text-gray-500">
              Easily migrate your existing projects in just a few minutes.
            </p>
          </Card>
          <Card className="p-4 shadow-sm hover:shadow-md cursor-pointer">
            <p className="font-semibold mb-1">Build an app on your own</p>
            <p className="text-sm text-gray-500">
              Start with a blank app and build your ideal workflow.
            </p>
          </Card>
        </div>

          {/* Bases section */}
          <div className="mb-4">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Recently opened</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {isLoading ? (
            <Card className="p-4 text-sm text-gray-500">Loading...</Card>
          ) : (
            <>
              {bases?.map((base) => {
                const isDeleting = deletingBaseId === base.id;
                return (
                  <div key={base.id} className="relative group">
                    <Link href={`/base/${base.id}`} className="block">
                      <Card className="p-4 border-2 border-gray-200 rounded-xl bg-white cursor-pointer hover:shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="bg-orange-200 rounded-xl w-10 h-10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-orange-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M4 4h16v16H4z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-800">{base.name}</p>
                            <p className="text-xs text-gray-500">Opened recently</p>
                          </div>
                        </div>
                      </Card>
                    </Link>

                    {/* Star button */}
                    <button
                      className="absolute top-2 right-10 bg-white rounded-md p-1 shadow hover:bg-gray-100"
                      aria-label="Star"
                    >
                      <Star className="w-4 h-4 text-gray-400 hover:text-yellow-500" />
                    </button>

                    {/* Dropdown menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="absolute top-2 right-2 bg-white rounded-md p-1 shadow hover:bg-gray-100"
                          aria-label="More options"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => console.log("Rename", base.id)}>Rename</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => console.log("Duplicate", base.id)}>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem>Move</DropdownMenuItem>
                        <DropdownMenuItem>Go to workspace</DropdownMenuItem>
                        <DropdownMenuItem>Customize appearance</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteBase.mutate({ baseId: base.id })}
                          disabled={isDeleting}
                          className={`text-red-500 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}

            </>
          )}
        </div>
        </div>
      </main>

      {/* Create Base Modal */}
      <Dialog open={showInput} onOpenChange={setShowInput}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create new base</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Base name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowInput(false);
                setName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create base"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
