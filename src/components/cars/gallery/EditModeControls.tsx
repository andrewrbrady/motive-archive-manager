import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface EditModeControlsProps {
  selectedCount: number;
  onDelete: () => void;
}

export function EditModeControls({
  selectedCount,
  onDelete,
}: EditModeControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          Edit Mode Active
        </Button>
      </div>
      <Button variant="destructive" onClick={onDelete}>
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Selected ({selectedCount})
      </Button>
    </div>
  );
}
