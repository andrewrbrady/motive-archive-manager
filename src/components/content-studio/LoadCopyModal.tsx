"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { SelectedCopy } from "./types";

interface LoadCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCopies: SelectedCopy[];
  hasExistingContent: boolean;
  compositionName?: string;
  onReplaceContent: (copies: SelectedCopy[]) => void;
  onCreateNew: (copies: SelectedCopy[]) => void;
}

/**
 * LoadCopyModal - Modal that handles loading copy with existing content conflict resolution
 *
 * When a user tries to load copy into a composer that already has content,
 * this modal asks them whether they want to:
 * 1. Replace current content (destructive)
 * 2. Create a new composition (safe)
 */
export function LoadCopyModal({
  isOpen,
  onClose,
  selectedCopies,
  hasExistingContent,
  compositionName,
  onReplaceContent,
  onCreateNew,
}: LoadCopyModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleReplaceContent = async () => {
    setIsLoading(true);
    try {
      onReplaceContent(selectedCopies);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async () => {
    setIsLoading(true);
    try {
      onCreateNew(selectedCopies);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load effect for when there's no existing content
  React.useEffect(() => {
    if (!hasExistingContent && isOpen && selectedCopies.length > 0) {
      onReplaceContent(selectedCopies);
      onClose();
    }
  }, [hasExistingContent, isOpen, selectedCopies, onReplaceContent, onClose]);

  // If no existing content, don't render the modal
  if (!hasExistingContent) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Load Copy
          </DialogTitle>
          <DialogDescription>
            You have existing content in your composition. What would you like
            to do?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {compositionName ? (
                <>
                  You're currently editing "<strong>{compositionName}</strong>"
                  which has content.
                </>
              ) : (
                <>You have unsaved content in your composition.</>
              )}
            </AlertDescription>
          </Alert>

          {/* Copy Preview */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Selected Copy:</div>
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              {selectedCopies.map((copy, index) => (
                <div key={copy.id} className="mb-2 last:mb-0">
                  <div className="font-medium text-xs text-muted-foreground mb-1">
                    Copy {index + 1}
                  </div>
                  <div className="line-clamp-3">
                    {copy.text.substring(0, 150)}
                    {copy.text.length > 150 && "..."}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleCreateNew}
              disabled={isLoading}
              className="w-full justify-start h-auto p-4"
              variant="outline"
            >
              <div className="flex items-center gap-3">
                <Plus className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Create New Composition</div>
                  <div className="text-sm text-muted-foreground">
                    Start fresh with the selected copy (recommended)
                  </div>
                </div>
              </div>
            </Button>

            <Button
              onClick={handleReplaceContent}
              disabled={isLoading}
              className="w-full justify-start h-auto p-4"
              variant="outline"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-orange-600" />
                <div className="text-left">
                  <div className="font-medium">Replace Current Content</div>
                  <div className="text-sm text-muted-foreground">
                    ⚠️ This will overwrite your existing content
                  </div>
                </div>
              </div>
            </Button>
          </div>

          {/* Cancel Button */}
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
