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
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Interfaces for upload and delete status
export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  error?: string;
  currentStep?: string;
}

export interface DeleteStatus {
  imageId: string;
  filename: string;
  status: "pending" | "deleting" | "complete" | "error";
  error?: string;
}

interface StatusNotificationProps {
  uploadProgress?: UploadProgress[];
  deleteStatus?: DeleteStatus[];
  isUploading?: boolean;
  isDeleting?: boolean;
  onClose?: () => void;
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
  uploadProgress = [],
  deleteStatus = [],
  isUploading = false,
  isDeleting = false,
  onClose,
}: StatusNotificationProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const hasUploads = uploadProgress.length > 0;
  const hasDeletions = deleteStatus.length > 0;

  // Set mounted state for client-side only rendering
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Auto-hide after all operations complete
  useEffect(() => {
    const allUploadsComplete = uploadProgress.every(
      (p) => p.status === "complete" || p.status === "error"
    );

    const allDeletionsComplete = deleteStatus.every(
      (d) => d.status === "complete" || d.status === "error"
    );

    // Show notification if there are active uploads or deletions
    if ((hasUploads && isUploading) || (hasDeletions && isDeleting)) {
      setIsVisible(true);
    }

    // Auto-hide after a delay when everything is complete
    if (
      (hasUploads || hasDeletions) &&
      allUploadsComplete &&
      allDeletionsComplete
    ) {
      const timer = setTimeout(() => {
        if (onClose) {
          onClose();
        } else {
          setIsVisible(false);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [
    uploadProgress,
    deleteStatus,
    isUploading,
    isDeleting,
    hasUploads,
    hasDeletions,
    onClose,
  ]);

  // If nothing to show, don't render
  if (!isVisible || (!hasUploads && !hasDeletions)) {
    return null;
  }

  // Get total, completed, and failed counts for header
  const getTotals = () => {
    if (hasUploads) {
      const completed = uploadProgress.filter(
        (p) => p.status === "complete"
      ).length;
      const failed = uploadProgress.filter((p) => p.status === "error").length;
      return {
        action: "Uploading",
        total: uploadProgress.length,
        completed,
        failed,
      };
    }

    if (hasDeletions) {
      const completed = deleteStatus.filter(
        (s) => s.status === "complete"
      ).length;
      const failed = deleteStatus.filter((s) => s.status === "error").length;
      return {
        action: "Deleting",
        total: deleteStatus.length,
        completed,
        failed,
      };
    }

    return {
      action: "",
      total: 0,
      completed: 0,
      failed: 0,
    };
  };

  const totals = getTotals();

  // Create the notification content
  const notificationContent = (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[9999] w-80 max-w-[calc(100vw-2rem)] bg-black rounded-lg shadow-xl overflow-hidden transition-all duration-200 text-white",
        !isVisible && "translate-y-full opacity-0"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-white" />
          <span className="font-medium">{totals.action}</span>
          <span className="text-sm text-gray-300">
            {totals.completed}/{totals.total}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-800 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-300" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-300" />
            )}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>

      {/* File list */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto border-t border-gray-800">
          {/* Upload items */}
          {uploadProgress.map((item, index) => (
            <div
              key={`upload-${index}`}
              className="px-4 py-3 border-b border-gray-800 last:border-0"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <Loader2
                    className={cn(
                      "w-5 h-5",
                      item.status === "complete"
                        ? "hidden"
                        : "animate-spin text-white"
                    )}
                  />
                  <Check
                    className={cn(
                      "w-5 h-5 text-green-500",
                      item.status !== "complete" && "hidden"
                    )}
                  />
                  <span className="font-medium text-sm">
                    {truncateFilename(item.fileName)}
                  </span>
                </div>
                <span className="text-sm">
                  {item.status === "complete"
                    ? "100%"
                    : item.status === "error"
                    ? "Error"
                    : `${Math.round(item.progress)}%`}
                </span>
              </div>

              {/* Simplified status line */}
              <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    item.status === "error" ? "bg-red-500" : "bg-blue-500"
                  )}
                  style={{ width: `${item.progress}%` }}
                />
              </div>

              {/* Only show upload status text when not complete */}
              {item.status !== "complete" && item.currentStep && (
                <div className="text-xs text-gray-400 mt-1">
                  {item.status === "uploading" ? "Uploading: " : ""}
                  {item.status === "analyzing" ? "Analyzing: " : ""}
                  {item.currentStep}
                </div>
              )}
            </div>
          ))}

          {/* Delete items - simpler design, matching uploads */}
          {deleteStatus.map((item, index) => (
            <div
              key={`delete-${index}`}
              className="px-4 py-3 border-b border-gray-800 last:border-0"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <Loader2
                    className={cn(
                      "w-5 h-5",
                      item.status === "complete" || item.status === "error"
                        ? "hidden"
                        : "animate-spin text-white"
                    )}
                  />
                  <Check
                    className={cn(
                      "w-5 h-5 text-green-500",
                      item.status !== "complete" && "hidden"
                    )}
                  />
                  <AlertTriangle
                    className={cn(
                      "w-5 h-5 text-red-500",
                      item.status !== "error" && "hidden"
                    )}
                  />
                  <span className="font-medium text-sm">
                    {truncateFilename(item.filename || `Image ${index + 1}`)}
                  </span>
                </div>
                <span className="text-sm">
                  {item.status === "complete"
                    ? "Complete"
                    : item.status === "error"
                    ? "Error"
                    : item.status === "deleting"
                    ? "Deleting"
                    : "Pending"}
                </span>
              </div>

              {/* Simplified status line for deletes */}
              <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    item.status === "error"
                      ? "bg-red-500"
                      : item.status === "complete"
                      ? "bg-blue-500 w-full"
                      : item.status === "deleting"
                      ? "bg-blue-500 w-1/2"
                      : "bg-blue-500 w-0"
                  )}
                />
              </div>

              {/* Only show error messages */}
              {item.error && (
                <div className="text-xs text-red-400 mt-1">{item.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Use createPortal to render the notification at the document root
  // Only run this on the client
  if (!isMounted) return null;

  return createPortal(notificationContent, document.body);
}
