"use client";

import React, { useState, useCallback } from "react";
import { useAPI } from "@/hooks/useAPI";
import { FileText, Trash2, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import type { DocumentationFile } from "./BaseDocumentation";

interface DocumentationEditorProps {
  carId: string;
  onUploadComplete: (newFiles: DocumentationFile[]) => void;
  onClose: () => void;
}

/**
 * DocumentationEditor - Non-blocking upload operations component
 * Part of Phase 3F optimization - converted from blocking modal to inline component
 * Users can switch tabs during upload operations
 */
export default function DocumentationEditor({
  carId,
  onUploadComplete,
  onClose,
}: DocumentationEditorProps) {
  const api = useAPI();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [error, setError] = useState<string | null>(null);

  /**
   * Drag and drop handlers - optimized for performance
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setSelectedFiles((prev) => [...prev, ...droppedFiles]);
    setError(null);
  }, []);

  /**
   * File selection handler
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      const newFiles = Array.from(fileList);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setError(null);
    }
  };

  /**
   * File upload with progress tracking - optimized for multiple files
   * PHASE 2 FIX: Non-blocking upload pattern prevents UI freezing
   */
  const handleUpload = () => {
    if (!api || selectedFiles.length === 0) return;

    // Immediate optimistic feedback
    setUploading(true);
    setError(null);
    setUploadProgress({});
    toast.success("Starting file upload in background...");

    // Background upload operation - non-blocking
    const uploadOperation = async () => {
      try {
        // Create upload promises with progress tracking
        const uploadPromises = selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("carId", carId);

          // Initialize progress for this file
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: 0,
          }));

          try {
            const xhr = new XMLHttpRequest();

            // Create upload promise with progress tracking
            const uploadPromise = new Promise<DocumentationFile>(
              (resolve, reject) => {
                xhr.upload.addEventListener("progress", (event) => {
                  if (event.lengthComputable) {
                    const progress = Math.round(
                      (event.loaded * 100) / event.total
                    );
                    setUploadProgress((prev) => ({
                      ...prev,
                      [file.name]: progress,
                    }));
                  }
                });

                xhr.onload = () => {
                  if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                      const response = JSON.parse(xhr.responseText);
                      resolve(response);
                    } catch (e) {
                      reject(new Error("Invalid response"));
                    }
                  } else {
                    reject(
                      new Error(`Upload failed with status ${xhr.status}`)
                    );
                  }
                };

                xhr.onerror = () => {
                  reject(new Error("Network error"));
                };
              }
            );

            // Start the upload
            xhr.open("POST", "/api/documentation/upload", true);
            xhr.send(formData);

            return await uploadPromise;
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            throw error;
          }
        });

        // Wait for all uploads to complete
        const results = await Promise.allSettled(uploadPromises);

        // Process successful uploads
        const successfulUploads = results
          .filter(
            (result): result is PromiseFulfilledResult<DocumentationFile> =>
              result.status === "fulfilled"
          )
          .map((result) => result.value);

        // Check for failures
        const failures = results.filter(
          (result) => result.status === "rejected"
        );
        if (failures.length > 0) {
          setError(`${failures.length} file(s) failed to upload`);
        }

        // Notify parent component of successful uploads
        if (successfulUploads.length > 0) {
          onUploadComplete(successfulUploads);
          toast.success(
            `Successfully uploaded ${successfulUploads.length} file(s)`
          );
        }

        // Clear selected files after upload attempt
        setSelectedFiles([]);
      } catch (error) {
        console.error("Error in upload process:", error);
        setError(
          error instanceof Error ? error.message : "Failed to upload files"
        );
      } finally {
        setUploading(false);
        // Keep progress visible briefly so users can see completion
        setTimeout(() => setUploadProgress({}), 2000);
      }
    };

    // Execute upload in background - non-blocking
    setTimeout(uploadOperation, 0);
  };

  /**
   * Utility function for file size formatting
   */
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="border rounded-lg shadow-sm bg-background">
      {/* Non-blocking upload message */}
      {uploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-t-lg p-3">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">
              Files uploading in background
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            You can switch tabs while files upload
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Upload Documentation Files</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Drag and drop area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border dark:border-border"
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <h3 className="text-lg font-medium">
              Drop files here or click to upload
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Upload documentation files related to this car such as user
              manuals, service records, ownership documents, etc.
            </p>
            <div className="mt-4">
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-md"
              >
                <span>Select Files</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  multiple
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Selected files list */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Selected Files</h4>
            <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-2"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate max-w-xs">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {uploadProgress[file.name] > 0 && (
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress[file.name]}%` }}
                        ></div>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelectedFiles((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      disabled={uploading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setSelectedFiles([])}
                disabled={uploading}
              >
                Clear All
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </div>

            {/* Error display */}
            {error && (
              <div className="bg-destructive/15 border border-destructive/20 rounded-md p-3">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
