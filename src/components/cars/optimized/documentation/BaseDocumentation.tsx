"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useAPIQuery } from "@/hooks/useAPIQuery";
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
 *
 * PHASE 3B OPTIMIZATION: Uses useAPIQuery for non-blocking data fetching
 */
export default function BaseDocumentation({
  carId,
  onRequestUpload,
}: BaseDocumentationProps) {
  // Use hooks at component level
  const api = useAPI();

  // Use optimized query hook - non-blocking, cached data fetching
  const {
    data: filesData,
    isLoading,
    error,
    refetch: refreshFiles,
  } = useAPIQuery<{ files: DocumentationFile[] }>(
    `cars/${carId}/documentation?fields=_id,filename,contentType,size,url,createdAt`,
    {
      staleTime: 3 * 60 * 1000, // 3 minutes cache
      retry: 2,
      retryDelay: 1000,
      // This ensures the query is enabled and won't block tab switching
      refetchOnWindowFocus: false,
    }
  );

  const [isDeletingFile, setIsDeletingFile] = useState<string | null>(null);

  // Memoize files array for performance
  const files = useMemo(() => {
    return filesData?.files || [];
  }, [filesData?.files]);

  /**
   * Optimized delete operation - uses callback to prevent re-renders
   */
  const handleDelete = useCallback(
    async (fileId: string) => {
      if (!api) return;
      setIsDeletingFile(fileId);

      try {
        await api.deleteWithBody("documentation/delete", { fileId, carId });

        // Refresh data after successful delete
        refreshFiles();
        toast.success("File deleted successfully");
      } catch (error) {
        console.error("Error deleting file:", error);
        toast.error("Failed to delete file");
      } finally {
        setIsDeletingFile(null);
      }
    },
    [api, carId, refreshFiles]
  );

  /**
   * Memoized utility functions for better performance
   */
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  const truncateFilename = useCallback(
    (filename: string, maxLength: number = 40) => {
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
    },
    []
  );

  // Handle error state without blocking UI
  if (error) {
    console.error("Error fetching documentation files:", error);
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

      {/* Error display - non-blocking */}
      {error && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-md p-3">
          <p className="text-destructive text-sm">
            Failed to load documentation files. Tab switching is still
            available.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshFiles()}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* File list - non-blocking loading */}
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
            <div className="p-4">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading files...
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                You can switch tabs while this loads
              </p>
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
  const { data, refetch } = useAPIQuery<{ files: DocumentationFile[] }>(
    `cars/${carId}/documentation?fields=_id,filename,contentType,size,url,createdAt`,
    {
      staleTime: 3 * 60 * 1000,
    }
  );

  const refreshFiles = useCallback(async () => {
    try {
      await refetch();
      if (data?.files) {
        onFilesUpdate(data.files);
      }
    } catch (error) {
      console.error("Error refreshing documentation files:", error);
    }
  }, [refetch, data?.files, onFilesUpdate]);

  return { refreshFiles };
}
