"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAPI } from "@/hooks/useAPI";
import { FileText, Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";

interface DocumentationFile {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentationFilesProps {
  carId: string;
}

export default function DocumentationFiles({ carId }: DocumentationFilesProps) {
  const api = useAPI();
  const [files, setFiles] = useState<DocumentationFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [isDeletingFile, setIsDeletingFile] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [carId, api]);

  const fetchFiles = async () => {
    if (!api) return;
    setIsLoadingFiles(true);
    try {
      const data = (await api.get(`cars/${carId}/documentation`)) as {
        files: DocumentationFile[];
      };
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching documentation files:", error);
      setError("Failed to load documentation files");
    } finally {
      setIsLoadingFiles(false);
    }
  };

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      const newFiles = Array.from(fileList);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!api) return;
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress({});

    try {
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

          // Create a promise to track the upload
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
                  reject(new Error(`Upload failed with status ${xhr.status}`));
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

      const results = await Promise.allSettled(uploadPromises);

      // Process successful uploads and add them to the files list
      const successfulUploads = results
        .filter(
          (result): result is PromiseFulfilledResult<DocumentationFile> =>
            result.status === "fulfilled"
        )
        .map((result) => result.value);

      if (successfulUploads.length > 0) {
        setFiles((prev) => [...successfulUploads, ...prev]);
      }

      // Check for failures
      const failures = results.filter((result) => result.status === "rejected");
      if (failures.length > 0) {
        setError(`${failures.length} file(s) failed to upload`);
      }

      // Clear all selected files after upload attempt
      setSelectedFiles([]);

      // Show a toast notification
      if (successfulUploads.length > 0) {
        toast.success(
          `Successfully uploaded ${successfulUploads.length} file(s)`
        );
      }
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

  const handleDelete = async (fileId: string) => {
    if (!api) return;
    setIsDeletingFile(fileId);
    try {
      await api.deleteWithBody("documentation/delete", { fileId, carId });

      setFiles((prev) => prev.filter((file) => file._id !== fileId));
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    } finally {
      setIsDeletingFile(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const truncateFilename = (filename: string, maxLength: number = 40) => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split(".").pop() || "";
    const nameWithoutExtension = filename.substring(
      0,
      filename.length - extension.length - 1
    );
    const truncatedName =
      nameWithoutExtension.substring(0, maxLength - extension.length - 3) +
      "...";
    return `${truncatedName}.${extension}`;
  };

  // Guard clause for API availability - moved to end after all hooks
  if (!api) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4">
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

        {selectedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-medium">Selected Files</h4>
            <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-2"
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate max-w-xs">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  {uploadProgress[file.name] > 0 && (
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
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
              ))}
            </div>
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
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
        )}
      </div>

      <div className="border rounded-md">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium">Uploaded Documentation</h3>
        </div>
        <div className="divide-y">
          {isLoadingFiles ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Loading documentation...
                </p>
              </div>
            </div>
          ) : files.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                No documentation files have been uploaded yet.
              </p>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file._id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                    >
                      {truncateFilename(file.filename)}
                    </a>
                    <div className="flex space-x-2 text-sm text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(file.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(file._id)}
                  disabled={isDeletingFile === file._id}
                >
                  {isDeletingFile === file._id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
