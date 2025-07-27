"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Table, FileText, Users, Calendar, Package } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTable: (data: { name: string; description?: string }) => Promise<void>;
  isCreating?: boolean;
};

const TABLE_TEMPLATES = [
  { 
    id: "blank", 
    name: "Start from scratch", 
    icon: Table, 
    description: "Create a blank table with custom fields",
    color: "#2D7FF9"
  },
  { 
    id: "project", 
    name: "Project tracker", 
    icon: FileText, 
    description: "Track project tasks, timelines, and assignees",
    color: "#18A957"
  },
  { 
    id: "crm", 
    name: "Customer CRM", 
    icon: Users, 
    description: "Manage customer relationships and interactions",
    color: "#F2994A"
  },
  { 
    id: "calendar", 
    name: "Content calendar", 
    icon: Calendar, 
    description: "Plan and schedule your content pipeline",
    color: "#9B51E0"
  },
  { 
    id: "inventory", 
    name: "Product inventory", 
    icon: Package, 
    description: "Track products, stock levels, and suppliers",
    color: "#EB5757"
  },
];

export function CreateTableModal({ open, onOpenChange, onCreateTable, isCreating }: Props) {
  const [tableName, setTableName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");

  const handleCreate = async () => {
    if (!tableName.trim()) return;
    
    await onCreateTable({
      name: tableName.trim(),
      description: description.trim() || undefined,
    });
    
    // Reset form
    setTableName("");
    setDescription("");
    setSelectedTemplate("blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create a new table</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Table name */}
          <div className="space-y-2">
            <Label htmlFor="table-name" className="text-[13px] font-medium">
              Table name
            </Label>
            <Input
              id="table-name"
              placeholder="e.g., Marketing campaigns, Product roadmap, Customer feedback"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="h-9 text-[13px]"
              autoFocus
            />
          </div>

          {/* Description (optional) */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-[13px] font-medium">
              Description (optional)
            </Label>
            <Textarea
              id="description"
              placeholder="What's this table for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] text-[13px] resize-none"
            />
          </div>

          {/* Templates */}
          <div className="space-y-2">
            <Label className="text-[13px] font-medium">
              Choose a template
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {TABLE_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`
                      p-4 rounded-lg border-2 text-left transition-all
                      ${selectedTemplate === template.id 
                        ? 'border-[#2D7FF9] bg-[#EBF3FE]' 
                        : 'border-[#E5E5E5] hover:border-[#D0D0D0] hover:bg-[#FAFAFA]'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: template.color + '20' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: template.color }} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[13px] font-medium text-[#333333]">
                          {template.name}
                        </h4>
                        <p className="text-[12px] text-[#666666] mt-0.5">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
            className="text-[13px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!tableName.trim() || isCreating}
            className="bg-[#2D7FF9] hover:bg-[#1968E0] text-white text-[13px]"
          >
            {isCreating ? "Creating..." : "Create table"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}