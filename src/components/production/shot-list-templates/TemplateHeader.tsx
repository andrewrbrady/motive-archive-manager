import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TemplateHeaderProps } from "./types";

export function TemplateHeader({
  onCreateNew,
  isCreating,
}: TemplateHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Shot List Templates</h2>
        <p className="text-muted-foreground">
          Create and manage reusable shot list templates for your productions
        </p>
      </div>

      <Button
        onClick={onCreateNew}
        disabled={isCreating}
        className="flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Create Template
      </Button>
    </div>
  );
}
