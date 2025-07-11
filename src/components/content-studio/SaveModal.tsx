"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  composerType: "email" | "news";
  isUpdate?: boolean;
  currentName?: string;
}

/**
 * SaveModal - Modal for prompting composition name when saving
 *
 * This modal appears when the user clicks "Save" on an unsaved composition
 * and prompts them to enter a name before saving.
 */
export function SaveModal({
  isOpen,
  onClose,
  onSave,
  composerType,
  isUpdate = false,
  currentName = "",
}: SaveModalProps) {
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setError("");
    }
  }, [isOpen, currentName]);

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter a name for your composition");
      return;
    }

    if (trimmedName.length < 3) {
      setError("Name must be at least 3 characters long");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onSave(trimmedName);
      onClose();
    } catch (error) {
      console.error("Save failed:", error);
      setError("Failed to save composition. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSaving) {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            {isUpdate ? "Update" : "Save"}{" "}
            {composerType === "email" ? "Email" : "News"} Composition
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="composition-name">Composition Name</Label>
            <Input
              id="composition-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Enter ${composerType} composition name...`}
              className="w-full"
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="text-sm text-muted-foreground">
            {isUpdate ? (
              <>
                Update your existing composition with any changes you've made.
              </>
            ) : (
              <>
                This will save your composition so you can continue editing it
                later.
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isUpdate ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isUpdate ? "Update" : "Save"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
