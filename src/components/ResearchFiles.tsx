"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

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

  useEffect(() => {
    fetchFiles();
  }, [carId]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/cars/${carId}/research`);
      if (!response.ok) throw new Error("Failed to fetch research files");
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching research files:", error);
      setError("Failed to load research files");
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
    const validFiles = droppedFiles.filter((file) =>
      [".txt", ".pdf", ".doc", ".docx", ".md"].some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      )
    );

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setError(null);
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

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("carId", carId);

        const response = await fetch("/api/research/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        return response.json();
      });

      const newFiles = await Promise.all(uploadPromises);
      setFiles((prev) => [...prev, ...newFiles]);
      setSelectedFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload files");
    } finally {
      setUploading(false);
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

  return (
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
              accept=".txt,.pdf,.doc,.docx,.md"
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
                  Supports .txt, .pdf, .doc, .docx, and .md files
                </p>
              </div>
            </label>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-sm text-zinc-400">
                {selectedFiles.length} file(s) selected
              </div>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                variant="secondary"
                className="w-full !bg-zinc-800 hover:!bg-zinc-700 !text-zinc-100 !border-transparent"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Upload className="h-4 w-4 animate-pulse" />
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
          </div>
          <div className="divide-y divide-zinc-800">
            {files.map((file) => (
              <div
                key={file._id}
                className="group py-4 flex items-start justify-between"
              >
                <div className="flex gap-4">
                  <FileText className="h-5 w-5 mt-0.5 text-zinc-400" />
                  <div className="space-y-1">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-zinc-100 hover:text-zinc-300 hover:underline"
                    >
                      {file.filename}
                    </a>
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
                  onClick={() => handleDelete(file._id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-400 hover:bg-transparent"
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
          </div>
        </div>
      </div>
    </div>
  );
}
