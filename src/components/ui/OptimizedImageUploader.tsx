/**
 * Optimized Image Uploader Component - Phase 1 Implementation
 *
 * A modern, high-performance image uploader with:
 * - Unified client-side optimization
 * - WebP format conversion
 * - Real-time progress tracking
 * - Drag & drop support
 * - Smart compression based on context
 */

import React, { useCallback, useRef, useState } from "react";
import {
  useImageOptimization,
  OptimizationProgress,
} from "@/hooks/useImageOptimization";
import { OptimizationResult } from "@/lib/imageOptimization";
import { Upload, X, CheckCircle, AlertCircle, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export interface OptimizedImageUploaderProps {
  onUploadComplete?: (results: { url: string; metadata?: any }[]) => void;
  onOptimizationComplete?: (results: OptimizationResult[]) => void;
  onProgress?: (progress: OptimizationProgress) => void;
  uploadEndpoint?: string;
  maxFiles?: number;
  context?: "car" | "project" | "general";
  acceptedFormats?: string[];
  disabled?: boolean;
  className?: string;
  metadata?: Record<string, any>;
  carId?: string;
  projectId?: string;
}

interface UploadFile {
  id: string;
  original: File;
  optimized?: File;
  optimizationResult?: OptimizationResult;
  uploadProgress: number;
  status:
    | "pending"
    | "optimizing"
    | "optimized"
    | "uploading"
    | "complete"
    | "error";
  error?: string;
}

export const OptimizedImageUploader: React.FC<OptimizedImageUploaderProps> = ({
  onUploadComplete,
  onOptimizationComplete,
  onProgress,
  uploadEndpoint = "/api/cloudflare/images",
  maxFiles = 10,
  context = "general",
  acceptedFormats = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"],
  disabled = false,
  className = "",
  metadata = {},
  carId,
  projectId,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const {
    optimizeBatch,
    progress: optimizationProgress,
    error: optimizationError,
    stats,
  } = useImageOptimization({
    context,
    autoOptimize: true,
    trackStats: true,
    quality: context === "car" ? 0.95 : 0.92, // Much higher quality preservation
  });

  // Handle file selection
  const handleFileSelect = useCallback(
    (selectedFiles: File[]) => {
      if (disabled) return;

      // Validate file count
      if (files.length + selectedFiles.length > maxFiles) {
        toast({
          title: "Too many files",
          description: `Maximum ${maxFiles} files allowed. Selected ${selectedFiles.length}, already have ${files.length}.`,
          variant: "destructive",
        });
        return;
      }

      // Validate file types
      const invalidFiles = selectedFiles.filter((file) => {
        const extension = "." + file.name.split(".").pop()?.toLowerCase();
        return !acceptedFormats.includes(extension);
      });

      if (invalidFiles.length > 0) {
        toast({
          title: "Invalid file format",
          description: `Supported formats: ${acceptedFormats.join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      // Create upload files
      const newFiles: UploadFile[] = selectedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        original: file,
        uploadProgress: 0,
        status: "pending",
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // Start optimization
      optimizeFiles(newFiles, selectedFiles);
    },
    [disabled, files.length, maxFiles, acceptedFormats, toast, optimizeBatch]
  );

  // Optimize files
  const optimizeFiles = useCallback(
    async (uploadFiles: UploadFile[], originalFiles: File[]) => {
      // Update status to optimizing
      setFiles((prev) =>
        prev.map((f) =>
          uploadFiles.find((uf) => uf.id === f.id)
            ? { ...f, status: "optimizing" as const }
            : f
        )
      );

      try {
        const results = await optimizeBatch(originalFiles);

        // Update files with optimization results
        setFiles((prev) =>
          prev.map((f) => {
            const uploadFile = uploadFiles.find((uf) => uf.id === f.id);
            if (uploadFile) {
              const resultIndex = uploadFiles.indexOf(uploadFile);
              const result = results[resultIndex];
              return {
                ...f,
                optimized: result.optimizedFile,
                optimizationResult: result,
                status: "optimized" as const,
              };
            }
            return f;
          })
        );

        onOptimizationComplete?.(results);

        // Show optimization stats
        if (stats) {
          const spaceSavedMB = stats.totalSpaceSaved / (1024 * 1024);
          toast({
            title: "Images optimized!",
            description: `Saved ${spaceSavedMB.toFixed(1)}MB (${(stats.averageCompressionRatio * 100 - 100).toFixed(0)}% reduction)`,
          });
        }
      } catch (error) {
        console.error("Optimization failed:", error);
        // Update status to error
        setFiles((prev) =>
          prev.map((f) =>
            uploadFiles.find((uf) => uf.id === f.id)
              ? { ...f, status: "error" as const, error: "Optimization failed" }
              : f
          )
        );

        toast({
          title: "Optimization failed",
          description:
            "Some images couldn't be optimized, but you can still upload them.",
          variant: "destructive",
        });
      }
    },
    [optimizeBatch, onOptimizationComplete, stats, toast]
  );

  // Upload files
  const uploadFiles = useCallback(async () => {
    if (isUploading) return;

    const filesToUpload = files.filter(
      (f) => f.status === "optimized" || f.status === "error"
    );
    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    const uploadResults: { url: string; metadata?: any }[] = [];

    for (const file of filesToUpload) {
      try {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "uploading" as const } : f
          )
        );

        const formData = new FormData();
        formData.append("files", file.optimized || file.original);
        formData.append(
          "metadata",
          JSON.stringify({
            ...metadata,
            optimized: !!file.optimized,
            context,
            originalSize: file.original.size,
            optimizedSize: file.optimized?.size || file.original.size,
          })
        );

        if (carId) formData.append("carId", carId);
        if (projectId) formData.append("projectId", projectId);

        const response = await fetch(uploadEndpoint, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && result.images?.length > 0) {
          uploadResults.push(...result.images);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? { ...f, status: "complete" as const, uploadProgress: 100 }
                : f
            )
          );
        } else {
          throw new Error(result.error || "Upload failed");
        }
      } catch (error) {
        console.error(`Upload failed for ${file.original.name}:`, error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: "error" as const,
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
      }
    }

    setIsUploading(false);

    if (uploadResults.length > 0) {
      onUploadComplete?.(uploadResults);
      toast({
        title: "Upload complete!",
        description: `Successfully uploaded ${uploadResults.length} images.`,
      });
    }
  }, [
    files,
    isUploading,
    uploadEndpoint,
    metadata,
    context,
    carId,
    projectId,
    onUploadComplete,
    toast,
  ]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFileSelect(droppedFiles);
    },
    [disabled, handleFileSelect]
  );

  // File input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFileSelect(Array.from(e.target.files));
      }
    },
    [handleFileSelect]
  );

  const getStatusIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "optimizing":
      case "uploading":
        return (
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
        );
      default:
        return <FileImage className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (file: UploadFile) => {
    switch (file.status) {
      case "pending":
        return "Pending";
      case "optimizing":
        return "Optimizing...";
      case "optimized":
        return `Optimized (${((1 - (file.optimizationResult?.optimizedSize || file.original.size) / file.original.size) * 100).toFixed(0)}% smaller)`;
      case "uploading":
        return "Uploading...";
      case "complete":
        return "Complete";
      case "error":
        return file.error || "Error";
      default:
        return "";
    }
  };

  const hasOptimizedFiles = files.some((f) => f.status === "optimized");
  const allOptimized =
    files.length > 0 &&
    files.every((f) => f.status === "optimized" || f.status === "error");

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900">
          Drop images here or click to browse
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Supports {acceptedFormats.join(", ")} up to {maxFiles} files
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Images will be automatically optimized to WebP format
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFormats.join(",")}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Optimization Progress */}
      {optimizationProgress.isOptimizing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Optimizing images...</span>
              <span className="text-sm text-gray-500">
                {optimizationProgress.completed}/{optimizationProgress.total}
              </span>
            </div>
            <Progress value={optimizationProgress.progress} className="mb-2" />
            <p className="text-xs text-gray-500">
              {optimizationProgress.currentFile}
            </p>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">
            Selected files ({files.length}/{maxFiles})
          </h3>
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(file.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.original.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getStatusText(file)} •{" "}
                        {(file.original.size / 1024).toFixed(0)}KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {hasOptimizedFiles && (
        <Button
          onClick={uploadFiles}
          disabled={!allOptimized || isUploading}
          className="w-full"
        >
          {isUploading
            ? "Uploading..."
            : `Upload ${files.filter((f) => f.status === "optimized").length} optimized images`}
        </Button>
      )}

      {/* Stats Display */}
      {stats && (
        <Card>
          <CardContent className="p-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Optimization Summary
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Space saved:</span>
                <span className="ml-1 font-medium">
                  {(stats.totalSpaceSaved / (1024 * 1024)).toFixed(1)}MB
                </span>
              </div>
              <div>
                <span className="text-gray-500">Compression:</span>
                <span className="ml-1 font-medium">
                  {((stats.averageCompressionRatio - 1) * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">Format conversions:</span>
                <span className="ml-1 font-medium">
                  {stats.formatConversions}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Avg processing:</span>
                <span className="ml-1 font-medium">
                  {stats.averageProcessingTime.toFixed(0)}ms
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
