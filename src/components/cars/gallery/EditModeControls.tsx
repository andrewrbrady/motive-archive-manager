import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X, AlertTriangle, CheckSquare, Square } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface EditModeControlsProps {
  selectedCount: number;
  totalCount?: number;
  onDelete: (deleteFromStorage?: boolean) => Promise<void>;
  onClearSelection?: () => void;
  onSelectAll?: () => void;
  onSelectNone?: () => void;
  isDeleting?: boolean;
}

export function EditModeControls({
  selectedCount,
  totalCount,
  onDelete,
  onClearSelection,
  onSelectAll,
  onSelectNone,
  isDeleting = false,
}: EditModeControlsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteFromStorage, setDeleteFromStorage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeleteClick = () => {
    if (selectedCount === 0) return;
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async (includeStorage: boolean) => {
    setIsProcessing(true);
    try {
      await onDelete(includeStorage);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting images:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setShowDeleteDialog(false);
    setDeleteFromStorage(false);
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1">
            Edit Mode Active
          </Badge>
          <div className="text-sm text-muted-foreground">
            {selectedCount > 0 ? (
              <>
                {selectedCount} of {totalCount || "?"} image
                {(totalCount || selectedCount) !== 1 ? "s" : ""} selected
              </>
            ) : (
              <>
                Click images to select them for batch operations
                {totalCount &&
                  ` • ${totalCount} image${totalCount !== 1 ? "s" : ""} available`}
                <span className="ml-2 text-xs opacity-75">
                  • Press{" "}
                  <kbd className="bg-muted px-1 rounded text-xs">Shift+E</kbd>{" "}
                  to exit edit mode
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Selection control buttons */}
          {onSelectAll && totalCount && totalCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              disabled={
                isDeleting || isProcessing || selectedCount === totalCount
              }
              title="Select all images"
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              Select All
            </Button>
          )}

          {onSelectNone && selectedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectNone}
              disabled={isDeleting || isProcessing}
              title="Clear selection"
            >
              <Square className="w-4 h-4 mr-2" />
              Select None
            </Button>
          )}

          {/* Legacy clear selection button - kept for backward compatibility */}
          {onClearSelection && selectedCount > 0 && !onSelectNone && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSelection}
              disabled={isDeleting || isProcessing}
            >
              <X className="w-4 h-4 mr-2" />
              Clear Selection
            </Button>
          )}

          {selectedCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
              disabled={selectedCount === 0 || isDeleting || isProcessing}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Deletion Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete {selectedCount} Image{selectedCount !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose how you want to delete the selected image
              {selectedCount !== 1 ? "s" : ""}:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 px-6">
            <div className="p-3 border rounded-md bg-muted/30">
              <div className="font-medium text-sm mb-1">Database Only</div>
              <div className="text-xs text-muted-foreground">
                Remove from your gallery but keep files in cloud storage. Images
                can be recovered if needed.
              </div>
            </div>

            <div className="p-3 border rounded-md bg-destructive/10 border-destructive/20">
              <div className="font-medium text-sm mb-1 text-destructive">
                Database + Cloud Storage
              </div>
              <div className="text-xs text-muted-foreground">
                Permanently delete from both gallery and cloud storage. This
                action cannot be undone.
              </div>
            </div>
          </div>

          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
            <AlertDialogCancel onClick={handleCancel} disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>

            <Button
              variant="outline"
              onClick={() => handleConfirmDelete(false)}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              Database Only
            </Button>

            <AlertDialogAction
              onClick={() => handleConfirmDelete(true)}
              disabled={isProcessing}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? "Deleting..." : "Database + Storage"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
