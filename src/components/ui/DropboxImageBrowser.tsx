import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RefreshCw,
  Download,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileImage,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

interface DropboxFile {
  name: string;
  path_display: string;
  size: number;
  client_modified: string;
  content_type?: string;
  tag: string;
}

interface DropboxImageBrowserProps {
  onImagesImported?: (imageIds: string[], folderUrl?: string) => void;
  onError?: (error: string) => void;
  initialFolderUrl?: string;
}

interface ImportProgress {
  total: number;
  completed: number;
  current?: string;
  errors: Array<{ path: string; error: string }>;
}

export default function DropboxImageBrowser({
  onImagesImported,
  onError,
  initialFolderUrl = "",
}: DropboxImageBrowserProps) {
  const [folderUrl, setFolderUrl] = useState(initialFolderUrl);
  const [images, setImages] = useState<DropboxFile[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(
    null
  );

  const handleBrowseFolder = async () => {
    if (!folderUrl.trim()) {
      toast.error("Please enter a Dropbox folder URL");
      return;
    }

    setIsLoading(true);
    setImages([]);
    setSelectedImages(new Set());

    try {
      const response = await fetch(
        `/api/dropbox/folder?url=${encodeURIComponent(folderUrl)}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to browse folder");
      }

      const data = await response.json();
      setImages(data.images || []);

      if (data.images.length === 0) {
        toast.info("No images found in this folder");
      } else {
        toast.success(`Found ${data.images.length} images`);
      }
    } catch (error) {
      console.error("Error browsing folder:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to browse folder";
      toast.error(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (imagePath: string, selected: boolean) => {
    const newSelected = new Set(selectedImages);
    if (selected) {
      newSelected.add(imagePath);
    } else {
      newSelected.delete(imagePath);
    }
    setSelectedImages(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedImages(new Set(images.map((img) => img.path_display)));
    } else {
      setSelectedImages(new Set());
    }
  };

  const handleImportSelected = async () => {
    if (selectedImages.size === 0) {
      toast.error("Please select images to import");
      return;
    }

    setIsImporting(true);
    setImportProgress({
      total: selectedImages.size,
      completed: 0,
      errors: [],
    });

    try {
      const response = await fetch("/api/dropbox/folder/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderUrl,
          selectedImages: Array.from(selectedImages),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to import images");
      }

      const result = await response.json();

      if (result.uploaded && result.uploaded.length > 0) {
        const cloudflareIds = result.uploaded.map(
          (img: any) => img.cloudflareId
        );

        // Update final progress
        setImportProgress({
          total: result.summary.total,
          completed: result.summary.successful,
          errors: result.errors || [],
        });

        if (onImagesImported) {
          onImagesImported(cloudflareIds, folderUrl);
        }

        toast.success(
          `Successfully imported ${result.summary.successful} of ${result.summary.total} images`
        );

        // Clear selection after successful import
        setSelectedImages(new Set());
      }

      if (result.errors && result.errors.length > 0) {
        console.warn("Some images failed to import:", result.errors);
        toast.warning(`${result.errors.length} images failed to import`);
      }
    } catch (error) {
      console.error("Error importing images:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to import images";
      toast.error(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportProgress(null), 3000);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Folder URL Input */}
      <div className="space-y-2 flex-shrink-0">
        <Label htmlFor="dropboxUrl">Dropbox Folder URL</Label>
        <div className="flex gap-2">
          <Input
            id="dropboxUrl"
            value={folderUrl}
            onChange={(e) => setFolderUrl(e.target.value)}
            placeholder="https://www.dropbox.com/sh/..."
            disabled={isLoading || isImporting}
          />
          <Button
            onClick={handleBrowseFolder}
            disabled={isLoading || isImporting}
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderOpen className="h-4 w-4" />
            )}
            Browse
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 flex-shrink-0">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading folder contents...</span>
          </div>
        </div>
      )}

      {/* Import Progress */}
      {importProgress && (
        <div className="border rounded-lg p-4 bg-muted/50 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <span className="font-medium">
              {isImporting ? "Importing images..." : "Import completed"}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {importProgress.completed} of {importProgress.total} images
            processed
            {importProgress.current && ` (${importProgress.current})`}
          </div>
          {importProgress.errors.length > 0 && (
            <div className="mt-2 text-sm text-destructive">
              {importProgress.errors.length} errors occurred
            </div>
          )}
        </div>
      )}

      {/* Images List */}
      {images.length > 0 && (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedImages.size === images.length}
                  onCheckedChange={handleSelectAll}
                  disabled={isImporting}
                />
                <Label htmlFor="select-all" className="text-sm">
                  Select all ({images.length} images)
                </Label>
              </div>
              {selectedImages.size > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedImages.size} selected
                </span>
              )}
            </div>
          </div>

          {/* Images Grid - Scrollable */}
          <div className="border rounded-lg divide-y flex-1 overflow-y-auto min-h-0">
            {images.map((image) => (
              <div
                key={image.path_display}
                className="flex items-center gap-3 p-3 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedImages.has(image.path_display)}
                  onCheckedChange={(checked) =>
                    handleImageSelect(image.path_display, checked as boolean)
                  }
                  disabled={isImporting}
                />
                <FileImage className="h-8 w-8 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {image.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(image.size)} •{" "}
                    {new Date(image.client_modified).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Import Button - Fixed at bottom */}
          <div className="flex-shrink-0 pt-2 border-t">
            <Button
              onClick={handleImportSelected}
              disabled={selectedImages.size === 0 || isImporting}
              className="w-full flex items-center gap-2"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Import Selected
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && images.length === 0 && folderUrl && (
        <div className="text-center py-8 flex-shrink-0">
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No images found in this folder
          </p>
        </div>
      )}
    </div>
  );
}
