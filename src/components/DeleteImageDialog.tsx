"use client";

import React from "react";
import { X, Loader2, Check, AlertTriangle } from "lucide-react";

interface DeleteStatus {
  imageId: string;
  status: "pending" | "deleting" | "complete" | "error";
  error?: string;
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Delete {imageCount > 1 ? `${imageCount} Images` : "Image"}
          </h3>
          {!isDeleting && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {isDeleting ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-sm text-gray-600">
                  Deleting images...
                </span>
                <div className="text-xs text-gray-500 space-x-2">
                  <span>{completed} completed</span>
                  {errors > 0 && (
                    <span className="text-red-500">{errors} failed</span>
                  )}
                  {pending > 0 && <span>{pending} pending</span>}
                </div>
              </div>
              <span className="text-sm font-medium">
                {getOverallProgress()}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  errors > 0 ? "bg-red-500" : "bg-blue-500"
                }`}
                style={{ width: `${getOverallProgress()}%` }}
              />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {deleteStatus.map((status, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-md ${
                    status.status === "error"
                      ? "bg-red-50"
                      : status.status === "complete"
                      ? "bg-green-50"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {status.status === "pending" && (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    {status.status === "deleting" && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    {status.status === "complete" && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    {status.status === "error" && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      Image {status.imageId.slice(-6)}
                    </span>
                  </div>
                  {status.error && (
                    <span className="text-xs text-red-500">{status.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              How would you like to delete{" "}
              {imageCount > 1 ? "these images" : "this image"}?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => onConfirm(false)}
                className="w-full px-4 py-2 text-left border rounded-lg hover:bg-gray-50"
              >
                <div className="font-medium">Remove from car only</div>
                <div className="text-sm text-gray-500">
                  The {imageCount > 1 ? "images" : "image"} will still be
                  available in your Cloudflare library
                </div>
              </button>
              <button
                onClick={() => onConfirm(true)}
                className="w-full px-4 py-2 text-left border border-red-200 rounded-lg hover:bg-red-50"
              >
                <div className="font-medium text-red-600">
                  Delete from car and Cloudflare
                </div>
                <div className="text-sm text-red-500">
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
