"use client";

import React from "react";
import { X, Loader2, Check, AlertTriangle } from "lucide-react";

// Common classes for consistent styling
const dialogClasses =
  "dark:bg-background-primary rounded-lg border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]";
const overlayClasses =
  "fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center";
const statusItemClasses = {
  base: "flex items-center justify-between p-2 rounded-md",
  error: "bg-destructive-50 dark:bg-destructive-950 bg-opacity-30",
  success: "bg-success-50 dark:bg-success-950 bg-opacity-30",
  pending: "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] bg-opacity-50",
};

interface DeleteStatus {
  imageId: string;
  status: "pending" | "deleting" | "complete" | "error";
  error?: string;
  filename?: string;
}

interface DeleteImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteFromCloudflare: boolean) => void;
  imageCount?: number;
  deleteStatus?: DeleteStatus[];
  isDeleting?: boolean;
}

export const DeleteImageDialog: React.FC<DeleteImageDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  imageCount = 1,
  deleteStatus = [],
  isDeleting = false,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleting, onClose, isOpen]);

  if (!isOpen) return null;

  const getOverallProgress = () => {
    if (deleteStatus.length === 0) return 0;
    const completed = deleteStatus.filter(
      (status) => status.status === "complete"
    ).length;
    return Math.round((completed / deleteStatus.length) * 100);
  };

  const getStatusSummary = () => {
    const completed = deleteStatus.filter(
      (status) => status.status === "complete"
    ).length;
    const errors = deleteStatus.filter(
      (status) => status.status === "error"
    ).length;
    const pending = deleteStatus.filter(
      (status) => status.status === "pending" || status.status === "deleting"
    ).length;

    return { completed, errors, pending };
  };

  const { completed, errors, pending } = getStatusSummary();

  return (
    <div className={overlayClasses}>
      <div className={`${dialogClasses} p-6 w-full max-w-md`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]">
            Delete {imageCount > 1 ? `${imageCount} Images` : "Image"}
          </h3>
          {!isDeleting && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] rounded-full text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {isDeleting ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                  Deleting images...
                </span>
                <div className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] space-x-2">
                  <span>{completed} completed</span>
                  {errors > 0 && (
                    <span className="text-destructive-500 dark:text-destructive-400">
                      {errors} failed
                    </span>
                  )}
                  {pending > 0 && <span>{pending} pending</span>}
                </div>
              </div>
              <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]">
                {getOverallProgress()}% Complete
              </span>
            </div>
            <div className="w-full bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  errors > 0
                    ? "bg-destructive-500 dark:bg-destructive-600"
                    : "bg-info-500 dark:bg-info-600"
                }`}
                style={{ width: `${getOverallProgress()}%` }}
              />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {deleteStatus.map((status, index) => (
                <div
                  key={index}
                  className={`${statusItemClasses.base} ${
                    status.status === "error"
                      ? statusItemClasses.error
                      : status.status === "complete"
                      ? statusItemClasses.success
                      : statusItemClasses.pending
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {status.status === "pending" && (
                      <div className="w-4 h-4 rounded-full border-2 border-[hsl(var(--border-primary))] dark:border-zinc-600" />
                    )}
                    {status.status === "deleting" && (
                      <Loader2 className="w-4 h-4 animate-spin text-info-500 dark:text-info-400" />
                    )}
                    {status.status === "complete" && (
                      <Check className="w-4 h-4 text-success-500 dark:text-success-400" />
                    )}
                    {status.status === "error" && (
                      <AlertTriangle className="w-4 h-4 text-destructive-500 dark:text-destructive-400" />
                    )}
                    <span className="text-sm text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]">
                      {status.filename || `Image ${index + 1}`}
                    </span>
                  </div>
                  {status.error && (
                    <span className="text-xs text-destructive-500 dark:text-destructive-400">
                      {status.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] mb-6">
              How would you like to delete{" "}
              {imageCount > 1 ? "these images" : "this image"}?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => onConfirm(false)}
                className="w-full px-4 py-2 text-left border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] bg-opacity-50"
              >
                <div className="font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]">
                  Remove from car only
                </div>
                <div className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                  The {imageCount > 1 ? "images" : "image"} will still be
                  available in your Cloudflare library
                </div>
              </button>
              <button
                onClick={() => onConfirm(true)}
                className="w-full px-4 py-2 text-left border border-destructive-200 dark:border-destructive-800 rounded-lg hover:bg-destructive-50 dark:hover:bg-destructive-950 bg-opacity-30"
              >
                <div className="font-medium text-destructive-600 dark:text-destructive-400">
                  Delete from car and Cloudflare
                </div>
                <div className="text-sm text-destructive-500 dark:text-destructive-400">
                  This action cannot be undone
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
