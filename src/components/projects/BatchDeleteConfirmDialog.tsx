"use client";

import React from "react";
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
import { AlertTriangle } from "lucide-react";

interface BatchDeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  imageCount: number;
  isDeleting?: boolean;
}

export function BatchDeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  imageCount,
  isDeleting = false,
}: BatchDeleteConfirmDialogProps) {
  const isSingle = imageCount === 1;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete {isSingle ? "Image" : `${imageCount} Images`}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isSingle
              ? "Are you sure you want to delete this image? This action will permanently remove the image from both the project gallery and cloud storage."
              : `Are you sure you want to delete ${imageCount} images? This action will permanently remove all selected images from both the project gallery and cloud storage.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="px-6 py-3">
          <div className="p-3 border rounded-md bg-destructive/10 border-destructive/20">
            <div className="font-medium text-sm mb-1 text-destructive">
              Permanent Deletion
            </div>
            <div className="text-xs text-muted-foreground">
              {isSingle
                ? "The image will be permanently deleted from both the project gallery and cloud storage. This action cannot be undone."
                : `All ${imageCount} images will be permanently deleted from both the project gallery and cloud storage. This action cannot be undone.`}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting
              ? "Deleting..."
              : `Delete ${isSingle ? "Image" : "Images"}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
