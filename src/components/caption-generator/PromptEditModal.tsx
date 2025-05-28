import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PromptEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromptEditModal({ open, onOpenChange }: PromptEditModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Prompt Template</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="text-muted-foreground">
            Prompt edit modal - to be implemented in Phase 3
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
