"use client";

import React, { useState, useEffect } from "react";
import { useAPI } from "@/hooks/useAPI";
import { FileText, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import { FileListSkeleton } from "./DocumentationSkeleton";

export interface DocumentationFile {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
  updatedAt: string;
}

interface BaseDocumentationProps {
  carId: string;
  onRequestUpload: () => void;
}

/**
 * BaseDocumentation - Critical path component for Documentation tab
 * Part of Phase 1C optimization - loads file list immediately with minimal operations
 * Heavy upload operations are delegated to DocumentationEditor (lazy loaded)
 */
export default function BaseDocumentation({
  carId,
  onRequestUpload,
}: BaseDocumentationProps) {
  const api = useAPI();
  const [files, setFiles] = useState<DocumentationFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingFile, setIsDeletingFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [carId, api]);

  /**
   * Critical path API call - loads file metadata only
   * Optimized query: fields=name,size,type,date for minimal payload
   */
  const fetchFiles = async () => {
    if (!api) return;
    setIsLoading(true);
    setError(null);

    try {
      // Critical path: load file list with minimal metadata for fast initial display
      const data = (await api.get(
        `cars/${carId}/documentation?fields=_id,filename,contentType,size,url,createdAt`
      )) as {
        files: DocumentationFile[];
      };

      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching documentation files:", error);
      setError("Failed to load documentation files");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Optimized delete operation - minimal UI updates
   */
  const handleDelete = async (fileId: string) => {
    if (!api) return;
    setIsDeletingFile(fileId);

    try {
      await api.deleteWithBody("documentation/delete", { fileId, carId });

      // Optimistic update for instant UI response
      setFiles((prev) => prev.filter((file) => file._id !== fileId));
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
      // Refresh files on error to ensure consistency
      fetchFiles();
    } finally {
      setIsDeletingFile(null);
    }
  };

  /**
   * Utility functions - moved to component scope for better performance
   */
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

  // Early return for API loading
  if (!api) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading...</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload prompt area - simplified for critical path */}
      <div className="border-2 border-dashed rounded-lg p-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-medium">Upload Documentation</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Upload documentation files such as user manuals, service records,
            and ownership documents.
          </p>
          <Button onClick={onRequestUpload} className="mt-4">
            Upload Files
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-md p-3">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* File list - critical path display */}
      <div className="border rounded-md">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium">Uploaded Documentation</h3>
          {files.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {files.length} file{files.length !== 1 ? "s" : ""} uploaded
            </p>
          )}
        </div>

        <div className="divide-y">
          {isLoading ? (
            <FileListSkeleton count={3} />
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
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline text-primary"
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
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
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

/**
 * Hook for external file list updates
 * Allows DocumentationEditor to update the file list after uploads
 */
export function useDocumentationSync(
  carId: string,
  onFilesUpdate: (files: DocumentationFile[]) => void
) {
  const api = useAPI();

  const refreshFiles = async () => {
    if (!api) return;

    try {
      const data = (await api.get(
        `cars/${carId}/documentation?fields=_id,filename,contentType,size,url,createdAt`
      )) as {
        files: DocumentationFile[];
      };

      onFilesUpdate(data.files || []);
    } catch (error) {
      console.error("Error refreshing documentation files:", error);
    }
  };

  return { refreshFiles };
}
