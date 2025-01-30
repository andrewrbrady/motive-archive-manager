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
    <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-[#111111] rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {isProcessing ? "Uploading images..." : "Upload complete"}
          </span>
          <div className="text-xs text-gray-500 dark:text-gray-400 space-x-2">
            {completed > 0 && <span>{completed} completed</span>}
            {errors > 0 && (
              <span className="text-red-500 dark:text-red-400">
                {errors} failed
              </span>
            )}
            {uploading > 0 && <span>{uploading} uploading</span>}
            {analyzing > 0 && <span>{analyzing} analyzing</span>}
            {pending > 0 && <span>{pending} pending</span>}
          </div>
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getOverallProgress()}% Complete
        </span>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            errors > 0
              ? "bg-red-500 dark:bg-red-600"
              : "bg-blue-500 dark:bg-blue-600"
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
                ? "bg-red-50 dark:bg-red-950/30"
                : progress.status === "complete"
                ? "bg-green-50 dark:bg-green-950/30"
                : "bg-gray-50 dark:bg-gray-800/50"
            }`}
          >
            <div className="flex items-center gap-2">
              {progress.status === "pending" && (
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
              )}
              {(progress.status === "uploading" ||
                progress.status === "analyzing") && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500 dark:text-blue-400" />
              )}
              {progress.status === "complete" && (
                <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
              )}
              {progress.status === "error" && (
                <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
              )}
              <div className="flex flex-col">
                <span className="text-sm truncate max-w-[200px] text-gray-700 dark:text-gray-300">
                  {progress.fileName}
                </span>
                {progress.currentStep && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {progress.currentStep}
                  </span>
                )}
              </div>
            </div>
            {progress.error ? (
              <span className="text-xs text-red-500 dark:text-red-400">
                {progress.error}
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {progress.progress}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
