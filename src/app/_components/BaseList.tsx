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
} from "lucide-react";

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

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-16 bg-white border-r flex flex-col items-center py-4 space-y-6">
        <Home className="text-gray-600 hover:text-blue-600" />
        <Star className="text-gray-400 hover:text-blue-600" />
        <Users className="text-gray-400 hover:text-blue-600" />
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">
        {/* Invite bar */}
        <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-2 rounded flex items-center justify-between text-sm mb-4">
          <span>
            ✅ Welcome to the improved Home. Find, navigate to, and manage your
            apps more easily.
          </span>
          <Button
            variant="ghost"
            className="text-sm text-green-700 hover:underline"
          >
            See what&apos;s new
          </Button>
        </div>

        {/* Top bar */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-gray-800">Home</h1>
          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                className="pl-10 text-sm"
              />
            </div>
            <HelpCircle className="text-gray-400 hover:text-blue-600" />
            <Bell className="text-gray-400 hover:text-blue-600" />
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-white">
              T
            </div>
          </div>
        </div>

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

        {/* Bases */}
        <h2 className="text-sm text-gray-600 mb-2">Opened anytime</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {isLoading ? (
            <Card className="p-4 text-sm text-gray-500">Loading...</Card>
          ) : (
            <>
              {bases?.map((base) => (
                <Link key={base.id} href={`/base/${base.id}`} className="block">
                  <Card className="p-4 border-2 border-orange-200 rounded-xl bg-orange-50 cursor-pointer hover:shadow-md">
                    <p className="font-medium">{base.name}</p>
                    <p className="text-xs text-gray-500">Opened recently</p>
                  </Card>
                </Link>
              ))}

              <Card
                className="p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-600 flex flex-col items-center justify-center"
                onClick={() => setShowInput(true)}
              >
                {showInput ? (
                  <div className="w-full">
                    <Input
                      placeholder="New base name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-sm mb-2"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreate} disabled={isCreating}>
                        {isCreating ? "Creating..." : "Create"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowInput(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Plus className="w-6 h-6 mb-1" />
                    <span className="text-sm">New Base</span>
                  </>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
