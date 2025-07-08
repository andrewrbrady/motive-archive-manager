"use client";

import React, { useState } from "react";
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
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api-client";
import { StylesheetMetadata } from "@/types/stylesheet";

interface StylesheetDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stylesheet: StylesheetMetadata;
  onSuccess: () => void;
}

export function StylesheetDeleteDialog({
  isOpen,
  onClose,
  stylesheet,
  onSuccess,
}: StylesheetDeleteDialogProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  // Check if this is the demo stylesheet (shouldn't be deleted)
  const isDemoStylesheet =
    stylesheet.name.toLowerCase().includes("demo") ||
    stylesheet.description?.toLowerCase().includes("demo") ||
    stylesheet.isDefault;

  const handleDelete = async () => {
    if (isDemoStylesheet) {
      toast({
        title: "Cannot Delete Demo Stylesheet",
        description:
          "The demo stylesheet cannot be deleted as it's required for system functionality.",
        variant: "destructive",
      });
      return;
    }

    try {
      setDeleting(true);

      await api.delete(`/stylesheets/${stylesheet.id}`);

      toast({
        title: "Stylesheet Deleted",
        description: `"${stylesheet.name}" has been successfully deleted.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to delete stylesheet:", error);

      let errorMessage = "Failed to delete stylesheet. Please try again.";
      if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete Stylesheet?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{stylesheet.name}"? This action
            cannot be undone and will permanently remove the stylesheet from the
            system.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Stylesheet Details */}
        <div className="px-6 py-3">
          <div className="space-y-3">
            <div>
              <div className="font-medium text-sm">{stylesheet.name}</div>
              {stylesheet.description && (
                <div className="text-xs text-muted-foreground">
                  {stylesheet.description}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">{stylesheet.classCount} classes</Badge>
              <Badge variant="outline">
                {stylesheet.categoryCount} categories
              </Badge>
              {stylesheet.clientName && (
                <Badge variant="secondary">{stylesheet.clientName}</Badge>
              )}
              {stylesheet.isDefault && (
                <Badge variant="destructive">Default</Badge>
              )}
            </div>

            {isDemoStylesheet && (
              <div className="p-3 border rounded-md bg-destructive/10 border-destructive/20">
                <div className="font-medium text-sm mb-1 text-destructive">
                  Cannot Delete Demo Stylesheet
                </div>
                <div className="text-xs text-muted-foreground">
                  This is a demo or system stylesheet that is required for
                  proper functionality. Demo stylesheets cannot be deleted.
                </div>
              </div>
            )}

            {!isDemoStylesheet && (
              <div className="p-3 border rounded-md bg-destructive/10 border-destructive/20">
                <div className="font-medium text-sm mb-1 text-destructive">
                  Permanent Deletion
                </div>
                <div className="text-xs text-muted-foreground">
                  The stylesheet will be permanently removed from the system.
                  Any content using this stylesheet will fall back to default
                  styling. This action cannot be undone.
                </div>
              </div>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={deleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting || isDemoStylesheet}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Stylesheet
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
