"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  DownloadCloud,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ProgressList,
  ProgressItem,
} from "@/components/ui/UploadProgressTracking";
import { ImageProgress } from "@/lib/hooks/query/useImages";

// Accept any progress type that matches our generic ProgressItem interface
export type UploadProgress = (ImageProgress | ProgressItem) & {
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
};

export interface DeleteStatus {
  imageId: string;
  filename: string;
  status: "pending" | "deleting" | "complete" | "error";
  error?: string;
}

interface StatusNotificationProps {
  show: boolean;
  onClose: () => void;
  uploadProgress: UploadProgress[];
  deleteStatus: DeleteStatus[];
  uploading: boolean;
  isDeleting: boolean;
  clearNotifications?: () => void;
}

// Helper function to truncate filenames
const truncateFilename = (filename: string, maxLength: number = 15): string => {
  if (filename.length <= maxLength) return filename;

  const extension = filename.includes(".")
    ? filename.substring(filename.lastIndexOf("."))
    : "";

  const nameWithoutExtension = filename.includes(".")
    ? filename.substring(0, filename.lastIndexOf("."))
    : filename;

  const truncatedName =
    nameWithoutExtension.substring(0, maxLength - extension.length - 3) + "...";
  return truncatedName + extension;
};

export function StatusNotification({
  show,
  onClose,
  uploadProgress,
  deleteStatus,
  uploading,
  isDeleting,
  clearNotifications,
}: StatusNotificationProps) {
  // Add useEffect to log visibility state changes
  useEffect(() => {
    if (show) {
      console.log("StatusNotification visibility ON", {
        uploadProgress: uploadProgress.length,
        uploading,
        show,
      });
    }
  }, [show, uploadProgress.length, uploading]);

  // Don't return null, but render with visibility:hidden to keep in DOM
  // This helps with smoother transitions and ensures it's ready to show
  if (!show) {
    return createPortal(
      <div
        className="fixed bottom-4 right-4 z-50 w-full max-w-md"
        style={{ visibility: "hidden" }}
      >
        <div className="bg-background border rounded-lg shadow-xl overflow-hidden">
          {/* Empty placeholder to maintain DOM presence */}
        </div>
      </div>,
      document.body
    );
  }

  const allCompleted =
    !uploading &&
    !isDeleting &&
    uploadProgress.every(
      (p) => p.status === "complete" || p.status === "error"
    ) &&
    deleteStatus.every((d) => d.status === "complete" || d.status === "error");

  const hasUploads = uploadProgress.length > 0;
  const hasDeletions = deleteStatus.length > 0;

  const uploadError = uploadProgress.some((p) => p.status === "error");
  const deleteError = deleteStatus.some((d) => d.status === "error");
  const hasErrors = uploadError || deleteError;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md">
      <div className="bg-background border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 slide-in-from-bottom-5">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            {allCompleted ? (
              hasErrors ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Completed with Errors
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-success" />
                  Completed Successfully
                </>
              )
            ) : uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Uploading Images
              </>
            ) : isDeleting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Deleting Images
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Processing Images
              </>
            )}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
            disabled={uploading || isDeleting} // Disable during active operations
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[40vh] overflow-y-auto p-4">
          {/* Use our ProgressList component for uploads */}
          {hasUploads && (
            <ProgressList items={uploadProgress as ProgressItem[]} />
          )}

          {/* Deletion status UI */}
          {hasDeletions && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm mb-2">
                Deletions ({deleteStatus.length})
              </h4>
              {deleteStatus.map((item, index) => (
                <div
                  key={`${item.imageId}-${index}`}
                  className="flex items-center gap-2 text-sm p-2 rounded-md border bg-background"
                >
                  {item.status === "error" ? (
                    <AlertCircle className="text-destructive h-4 w-4 flex-shrink-0" />
                  ) : item.status === "complete" ? (
                    <CheckCircle className="text-success h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Loader2 className="text-primary h-4 w-4 flex-shrink-0 animate-spin" />
                  )}
                  <div className="truncate flex-grow">
                    <div className="truncate font-medium">{item.filename}</div>
                    {item.error && (
                      <div className="text-destructive text-xs">
                        {item.error}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.status === "pending"
                      ? "Pending"
                      : item.status === "deleting"
                      ? "Deleting..."
                      : item.status === "complete"
                      ? "Deleted"
                      : "Failed"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-3 bg-muted/50 border-t">
          {allCompleted && clearNotifications && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearNotifications}
              className="text-sm"
            >
              Clear All
            </Button>
          )}
          <Button
            variant={allCompleted ? "default" : "outline"}
            size="sm"
            onClick={onClose}
            className="text-sm"
            disabled={uploading || isDeleting} // Disable during active operations
          >
            {allCompleted ? "Close" : "Hide"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
