"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

interface UploadedFile {
  id: string;
  openaiFileId: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

interface FileUploadDropzoneProps {
  entityType: "car" | "project";
  entityId: string;
  onFilesUploaded: (fileIds: string[]) => void;
  onError: (error: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  disabled?: boolean;
}

export function FileUploadDropzone({
  entityType,
  entityId,
  onFilesUploaded,
  onError,
  maxFiles = 5,
  maxFileSize = 10,
  acceptedTypes = [".pdf", ".doc", ".docx", ".txt"],
  disabled = false,
}: FileUploadDropzoneProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, loading: authLoading, isAuthenticated } = useFirebaseAuth();

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }

    // Check file type
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedTypes.includes(extension)) {
      return `File type ${extension} is not supported. Accepted types: ${acceptedTypes.join(", ")}`;
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<UploadedFile> => {
    const fileId =
      Date.now().toString() + Math.random().toString(36).substr(2, 9);

    const newFile: UploadedFile = {
      id: fileId,
      openaiFileId: "",
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: "uploading",
    };

    // Add to state immediately
    setUploadedFiles((prev) => [...prev, newFile]);

    try {
      // Check authentication state first
      if (authLoading) {
        throw new Error(
          "Authentication still loading. Please wait a moment and try again."
        );
      }

      if (!isAuthenticated || !user) {
        throw new Error(
          "Please sign in to upload files. Authentication required."
        );
      }

      // Get auth token from Firebase user with retry for token refresh
      let authToken: string;
      try {
        authToken = await user.getIdToken(true); // Force refresh to ensure valid token
      } catch (tokenError) {
        console.error("Token error:", tokenError);
        throw new Error(
          "Failed to get authentication token. Please sign in again."
        );
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      formData.append("entityId", entityId);
      formData.append(
        "description",
        `File uploaded for ${entityType} ${entityId}`
      );
      formData.append("category", "general");

      const response = await fetch("/api/ai-files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "x-user-id": user.uid, // Add user ID as backup
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Upload failed with status: ${response.status}`
        );
      }

      const result = await response.json();

      // Update with success
      const successFile: UploadedFile = {
        ...newFile,
        openaiFileId: result.fileId,
        progress: 100,
        status: "success",
      };

      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === fileId ? successFile : f))
      );

      return successFile;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";

      // Update with error
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "error", error: errorMessage } : f
        )
      );

      throw error;
    }
  };

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (disabled || isUploading) return;

      // Check authentication before starting upload
      if (authLoading) {
        onError(
          "Authentication still loading. Please wait a moment and try again."
        );
        return;
      }

      if (!isAuthenticated || !user) {
        onError("Please sign in to upload files. Authentication required.");
        return;
      }

      const fileArray = Array.from(files);

      // Check max files limit
      if (uploadedFiles.length + fileArray.length > maxFiles) {
        onError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate files
      const validationErrors = fileArray
        .map((file) => validateFile(file))
        .filter(Boolean);

      if (validationErrors.length > 0) {
        onError(validationErrors[0]!);
        return;
      }

      setIsUploading(true);

      try {
        const uploadPromises = fileArray.map(uploadFile);
        const uploadedResults = await Promise.allSettled(uploadPromises);

        // Get successful uploads
        const successfulUploads = uploadedResults
          .filter(
            (result): result is PromiseFulfilledResult<UploadedFile> =>
              result.status === "fulfilled" && result.value.status === "success"
          )
          .map((result) => result.value.openaiFileId);

        if (successfulUploads.length > 0) {
          onFilesUploaded(successfulUploads);
        }

        // Handle errors
        const errors = uploadedResults
          .filter(
            (result): result is PromiseRejectedResult =>
              result.status === "rejected"
          )
          .map((result) => result.reason.message);

        if (errors.length > 0) {
          onError(`Some files failed to upload: ${errors.join(", ")}`);
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [
      disabled,
      isUploading,
      uploadedFiles.length,
      maxFiles,
      entityType,
      entityId,
      onFilesUploaded,
      onError,
      authLoading,
      isAuthenticated,
      user,
    ]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (!disabled && e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (fileId: string) => {
      setUploadedFiles((prev) => {
        const newFiles = prev.filter((f) => f.id !== fileId);
        // Update parent with current file IDs
        const successfulFileIds = newFiles
          .filter((f) => f.status === "success")
          .map((f) => f.openaiFileId);
        onFilesUploaded(successfulFileIds);
        return newFiles;
      });
    },
    [onFilesUploaded]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const canUploadMore = uploadedFiles.length < maxFiles && !disabled;

  return (
    <div className="space-y-4">
      {/* Authentication Warning */}
      {authLoading && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Loading authentication... Please wait before uploading files.
          </AlertDescription>
        </Alert>
      )}

      {!authLoading && !isAuthenticated && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to upload files. Authentication is required.
          </AlertDescription>
        </Alert>
      )}

      {/* Dropzone */}
      {canUploadMore && isAuthenticated && !authLoading && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(",")}
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />

          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isDragOver
              ? "Drop files here"
              : "Click to upload or drag and drop"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {acceptedTypes.join(", ")} up to {maxFileSize}MB each
          </p>
        </div>
      )}

      {/* Disabled dropzone for unauthenticated users */}
      {canUploadMore && (!isAuthenticated || authLoading) && (
        <div className="border-2 border-dashed rounded-lg p-6 text-center transition-colors border-muted-foreground/25 opacity-50 cursor-not-allowed">
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">
            {authLoading ? "Loading..." : "Sign in required"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {authLoading
              ? "Please wait for authentication to complete"
              : "Please sign in to upload files"}
          </p>
        </div>
      )}

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Uploaded Files ({uploadedFiles.length}/{maxFiles})
          </h4>

          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20"
            >
              <FileText className="w-4 h-4 flex-shrink-0 text-muted-foreground" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>

                {file.status === "uploading" && (
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div
                      className="bg-primary h-1 rounded-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Status Icon */}
              <div className="flex-shrink-0">
                {file.status === "uploading" && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
                {file.status === "success" && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {file.status === "error" && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id)}
                className="h-8 w-8 p-0 hover:bg-destructive/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {uploadedFiles.some((f) => f.status === "error") && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Some files failed to upload. Please try again or contact
                support.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground">
        <p>Files will be used as context for AI conversations.</p>
        <p>
          Supported formats: {acceptedTypes.join(", ")} • Max size:{" "}
          {maxFileSize}MB per file
        </p>
      </div>
    </div>
  );
}
