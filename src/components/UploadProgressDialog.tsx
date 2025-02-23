"use client";

import React from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  error?: string;
  currentStep?: string;
}

interface UploadProgressDialogProps {
  uploadProgress: UploadProgress[];
}

export const UploadProgressDialog: React.FC<UploadProgressDialogProps> = ({
  uploadProgress = [],
}) => {
  if (uploadProgress.length === 0) return null;

  const getOverallProgress = () => {
    if (uploadProgress.length === 0) return 0;
    const totalProgress = uploadProgress.reduce(
      (sum, item) => sum + item.progress,
      0
    );
    return Math.round(totalProgress / uploadProgress.length);
  };

  const getStatusSummary = () => {
    const completed = uploadProgress.filter(
      (status) => status.status === "complete"
    ).length;
    const errors = uploadProgress.filter(
      (status) => status.status === "error"
    ).length;
    const uploading = uploadProgress.filter(
      (status) => status.status === "uploading"
    ).length;
    const analyzing = uploadProgress.filter(
      (status) => status.status === "analyzing"
    ).length;
    const pending = uploadProgress.filter(
      (status) => status.status === "pending"
    ).length;

    return { completed, errors, uploading, analyzing, pending };
  };

  const { completed, errors, uploading, analyzing, pending } =
    getStatusSummary();
  const isProcessing = uploading > 0 || analyzing > 0 || pending > 0;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-[var(--background-primary)] dark:bg-[var(--background-primary)] rounded-lg shadow-lg border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]">
            {isProcessing ? "Uploading images..." : "Upload complete"}
          </span>
          <div className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] space-x-2">
            {completed > 0 && <span>{completed} completed</span>}
            {errors > 0 && (
              <span className="text-destructive-500 dark:text-destructive-400">
                {errors} failed
              </span>
            )}
            {uploading > 0 && <span>{uploading} uploading</span>}
            {analyzing > 0 && <span>{analyzing} analyzing</span>}
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
        {uploadProgress.map((progress, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-2 rounded-md ${
              progress.status === "error"
                ? "bg-destructive-50 dark:bg-destructive-950 bg-opacity-30"
                : progress.status === "complete"
                ? "bg-success-50 dark:bg-success-950 bg-opacity-30"
                : "bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] bg-opacity-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {progress.status === "pending" && (
                <div className="w-4 h-4 rounded-full border-2 border-[hsl(var(--border-primary))] dark:border-zinc-600" />
              )}
              {(progress.status === "uploading" ||
                progress.status === "analyzing") && (
                <Loader2 className="w-4 h-4 animate-spin text-info-500 dark:text-info-400" />
              )}
              {progress.status === "complete" && (
                <Check className="w-4 h-4 text-success-500 dark:text-success-400" />
              )}
              {progress.status === "error" && (
                <AlertTriangle className="w-4 h-4 text-destructive-500 dark:text-destructive-400" />
              )}
              <div className="flex flex-col">
                <span className="text-sm truncate max-w-[200px] text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]">
                  {progress.fileName}
                </span>
                {progress.currentStep && (
                  <span className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
                    {progress.currentStep}
                  </span>
                )}
              </div>
            </div>
            {progress.error ? (
              <span className="text-xs text-destructive-500 dark:text-destructive-400">
                {progress.error}
              </span>
            ) : (
              <span className="text-xs font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]">
                {progress.progress}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
