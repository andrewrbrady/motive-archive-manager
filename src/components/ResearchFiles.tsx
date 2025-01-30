"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import MarkdownViewer from "./MarkdownViewer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ResearchFile {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
  updatedAt: string;
}

interface ResearchFilesProps {
  carId: string;
}

export default function ResearchFiles({ carId }: ResearchFilesProps) {
  const [files, setFiles] = useState<ResearchFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ResearchFile | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const fetchFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch(`/api/cars/${carId}/research`);
      if (!response.ok) throw new Error("Failed to fetch research files");
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching research files:", error);
      setError("Failed to load research files");
    } finally {
      setIsLoadingFiles(false);
    }
  }, [carId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

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
    const validFiles = droppedFiles.filter((file) =>
      file.name.toLowerCase().endsWith(".md")
    );

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setError(null);
    } else {
      setError("Only markdown (.md) files are supported");
    }
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

        const response = await fetch("/api/research/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        // Set progress to 100% when complete
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: 100,
        }));

        return response.json();
      });

      const newFiles = await Promise.all(uploadPromises);
      setFiles((prev) => [...prev, ...newFiles]);
      setSelectedFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload files");
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch(
        `/api/cars/${carId}/research?fileId=${fileId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete file");

      setFiles((prev) => prev.filter((file) => file._id !== fileId));
    } catch (error) {
      console.error("Error deleting file:", error);
      setError("Failed to delete file");
    }
  };

  const handleDeleteAll = async () => {
    if (!files.length) return;

    setIsDeletingAll(true);
    setError(null);

    try {
      const response = await fetch(`/api/cars/${carId}/research/all`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete all files");

      setFiles([]);
      setSelectedFile(null);
      setMarkdownContent("");
    } catch (error) {
      console.error("Error deleting all files:", error);
      setError("Failed to delete all files");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const truncateFilename = (filename: string, maxLength: number = 40) => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split(".").pop();
    const nameWithoutExt = filename.slice(0, filename.lastIndexOf("."));
    const truncatedName = nameWithoutExt.slice(
      0,
      maxLength - 3 - (extension?.length || 0)
    );
    return `${truncatedName}...${extension ? `.${extension}` : ""}`;
  };

  const handleFileClick = async (file: ResearchFile) => {
    setIsLoadingContent(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/cars/${carId}/research/content?fileId=${file._id}`
      );
      if (!response.ok) throw new Error("Failed to fetch file content");
      const content = await response.text();
      setMarkdownContent(content);
      setSelectedFile(file);
    } catch (error) {
      console.error("Error loading markdown content:", error);
      setError("Failed to load file content");
      setMarkdownContent("");
      setSelectedFile(null);
    } finally {
      setIsLoadingContent(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold leading-none tracking-tight text-zinc-100">
                  Upload Research Files
                </h3>
              </div>
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-zinc-500 bg-zinc-800/50"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <input
                  type="file"
                  id="file"
                  multiple
                  onChange={handleFileSelect}
                  accept=".md"
                  className="hidden"
                />
                <label
                  htmlFor="file"
                  className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-zinc-400" />
                  <div className="text-zinc-400">
                    <span className="font-medium text-zinc-300">
                      Drop files here or click to upload
                    </span>
                    <p className="text-sm mt-1">
                      Supports markdown (.md) files only
                    </p>
                  </div>
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    {selectedFiles.map((file) => (
                      <div key={file.name} className="text-sm text-zinc-400">
                        <div className="flex items-center justify-between mb-1">
                          <span>{file.name}</span>
                          <span>{uploadProgress[file.name] || 0}%</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1">
                          <div
                            className="bg-zinc-400 h-1 rounded-full transition-all duration-300"
                            style={{
                              width: `${uploadProgress[file.name] || 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    variant="secondary"
                    className="w-full !bg-zinc-800 hover:!bg-zinc-700 !text-zinc-100 !border-transparent"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Upload className="h-4 w-4 animate-spin" />
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload {selectedFiles.length} File
                        {selectedFiles.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-900/50 bg-red-900/10 p-4 text-red-400">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-zinc-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold leading-none tracking-tight text-zinc-100">
                  Research Files
                </h3>
                {files.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDeletingAll}
                        className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
                      >
                        <span className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4" />
                          Delete All
                        </span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-900 border border-zinc-800">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-zinc-100">
                          Delete All Research Files
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          This action cannot be undone. This will permanently
                          delete all research files for this car.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border-zinc-700">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAll}
                          disabled={isDeletingAll}
                          className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                          {isDeletingAll ? (
                            <span className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4 animate-spin" />
                              Deleting...
                            </span>
                          ) : (
                            "Delete All"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className="divide-y divide-zinc-800">
                {isLoadingFiles ? (
                  <div className="py-8 text-center text-zinc-400">
                    <div className="animate-pulse space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <div className="h-5 w-5 bg-zinc-800 rounded" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-zinc-800 rounded w-3/4" />
                            <div className="h-3 bg-zinc-800 rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {files.map((file) => (
                      <div
                        key={file._id}
                        className={`group py-4 flex items-start justify-between cursor-pointer hover:bg-zinc-800/50 px-4 -mx-4 rounded ${
                          selectedFile?._id === file._id ? "bg-zinc-800/50" : ""
                        }`}
                        onClick={() => handleFileClick(file)}
                      >
                        <div className="flex gap-4 min-w-0 flex-1">
                          <FileText className="h-5 w-5 mt-0.5 text-zinc-400 flex-shrink-0" />
                          <div className="space-y-1 min-w-0">
                            <span className="font-medium text-zinc-100 hover:text-zinc-300 block truncate">
                              {truncateFilename(file.filename)}
                            </span>
                            <div className="text-sm text-zinc-400">
                              {formatFileSize(file.size)} •{" "}
                              {formatDistanceToNow(new Date(file.createdAt), {
                                addSuffix: true,
                              })}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file._id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-400 hover:bg-transparent flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {files.length === 0 && (
                      <div className="py-8 text-center text-zinc-400">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No research files uploaded yet</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-[600px]">
          {isLoadingContent ? (
            <div className="rounded-lg border border-zinc-800 h-full">
              <div className="p-4 border-b border-zinc-800">
                <div className="h-6 bg-zinc-800 rounded w-1/3 animate-pulse" />
              </div>
              <div className="p-6">
                <div className="space-y-4 animate-pulse">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-zinc-800 rounded w-full" />
                      <div className="h-4 bg-zinc-800 rounded w-5/6" />
                      <div className="h-4 bg-zinc-800 rounded w-4/6" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedFile ? (
            <MarkdownViewer
              content={markdownContent}
              filename={selectedFile.filename}
            />
          ) : (
            <div className="rounded-lg border border-zinc-800 h-full flex items-center justify-center">
              <div className="text-center text-zinc-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Select a file to view its contents</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
