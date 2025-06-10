import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, X, Check, UploadCloud } from "lucide-react";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import { Deliverable } from "@/types/deliverable";
import { toast } from "sonner";
import { useAPI } from "@/hooks/useAPI";
import { getValidToken } from "@/lib/api-client";

interface ThumbnailSelectorProps {
  deliverable: Deliverable;
  linkedGalleries: any[];
  onUpdate: (updates: Partial<Deliverable>) => Promise<void>;
}

export default function ThumbnailSelector({
  deliverable,
  linkedGalleries,
  onUpdate,
}: ThumbnailSelectorProps) {
  const api = useAPI();
  const [isSelecting, setIsSelecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Get all images from linked galleries
  const availableImages = linkedGalleries.flatMap((gallery) =>
    (gallery.images || []).map((image: any) => ({
      ...image,
      galleryName: gallery.name || "Untitled Gallery",
    }))
  );

  const handleImageSelect = async (imageId: string, imageUrl: string) => {
    try {
      // Ensure the URL has a proper variant for CloudflareImage component
      let thumbnailUrl = imageUrl;
      if (thumbnailUrl.includes("imagedelivery.net")) {
        // Remove any existing variant and use /public for original quality
        thumbnailUrl = thumbnailUrl.replace(/\/[^\/]+$/, "");
        thumbnailUrl = `${thumbnailUrl}/public`;
      }

      console.log("Image selection:", {
        imageId,
        originalUrl: imageUrl,
        finalUrl: thumbnailUrl,
      });

      await onUpdate({
        primaryImageId: imageId,
        thumbnailUrl: thumbnailUrl,
      });
      setIsSelecting(false);
      toast.success("Thumbnail updated successfully");
    } catch (error) {
      console.error("Error updating thumbnail:", error);
      toast.error("Failed to update thumbnail");
    }
  };

  const handleRemoveThumbnail = async () => {
    try {
      await onUpdate({
        primaryImageId: undefined,
        thumbnailUrl: undefined,
      });
      toast.success("Thumbnail removed successfully");
    } catch (error) {
      console.error("Error removing thumbnail:", error);
      toast.error("Failed to remove thumbnail");
    }
  };

  const uploadFile = async (file: File) => {
    if (!file || !api) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 8MB, same as car uploader)
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File size must be less than 8MB");
      return;
    }

    setIsUploading(true);
    try {
      // Use simple cloudflare thumbnails endpoint (no SSE, no car association)
      const formData = new FormData();
      formData.append("file", file);

      // Get auth token for the request
      const token = await getValidToken();

      const response = await fetch("/api/cloudflare/thumbnails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Upload failed: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.success && result.imageId && result.imageUrl) {
        // Ensure the URL has a proper variant for CloudflareImage component
        let thumbnailUrl = result.imageUrl;
        if (thumbnailUrl.includes("imagedelivery.net")) {
          // Remove any existing variant and use /public for original quality
          thumbnailUrl = thumbnailUrl.replace(/\/[^\/]+$/, "");
          thumbnailUrl = `${thumbnailUrl}/public`;
        }

        console.log("Upload result:", {
          imageId: result.imageId,
          originalUrl: result.imageUrl,
          finalUrl: thumbnailUrl,
        });

        await onUpdate({
          primaryImageId: result.imageId,
          thumbnailUrl: thumbnailUrl,
        });

        toast.success("Thumbnail uploaded and set successfully");
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload thumbnail"
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragOver to false if we're leaving the drop zone itself
    if (
      dropZoneRef.current &&
      !dropZoneRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith("image/"));

      if (imageFile) {
        await uploadFile(imageFile);
      } else {
        toast.error("Please drop an image file");
      }
    },
    [uploadFile]
  );

  const handleDropZoneClick = () => {
    if (!deliverable.thumbnailUrl && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4 p-4 bg-transparent border border-border/30 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Thumbnail
        </h3>
        <div className="flex items-center gap-2">
          {deliverable.primaryImageId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveThumbnail}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-1" />
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSelecting(!isSelecting)}
            disabled={availableImages.length === 0}
          >
            {isSelecting ? "Cancel" : "Select"}
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Current thumbnail display or drag and drop zone */}
      {deliverable.thumbnailUrl ? (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          <CloudflareImage
            src={deliverable.thumbnailUrl}
            alt={`${deliverable.title} thumbnail`}
            fill
            className="object-contain"
            variant="public"
            showError={true}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              console.error("CloudflareImage error for thumbnail:", {
                src: deliverable.thumbnailUrl,
                currentSrc: target.src,
                error: e.type,
                naturalWidth: target.naturalWidth,
                naturalHeight: target.naturalHeight,
              });
            }}
          />
        </div>
      ) : (
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleDropZoneClick}
          className={`
            aspect-video rounded-lg bg-muted flex items-center justify-center 
            border-2 border-dashed transition-all cursor-pointer
            ${
              isDragOver
                ? "border-primary bg-primary/5 scale-105"
                : "border-border/50 hover:border-border/80 hover:bg-muted/80"
            }
            ${isUploading ? "pointer-events-none opacity-50" : ""}
          `}
        >
          <div className="text-center p-6">
            {isUploading ? (
              <>
                <UploadCloud className="h-12 w-12 text-primary mx-auto mb-3 animate-pulse" />
                <p className="text-sm font-medium text-foreground">
                  Uploading thumbnail...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please wait
                </p>
              </>
            ) : isDragOver ? (
              <>
                <UploadCloud className="h-12 w-12 text-primary mx-auto mb-3" />
                <p className="text-sm font-medium text-primary">
                  Drop image here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Release to upload
                </p>
              </>
            ) : (
              <>
                <UploadCloud className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Drop image here or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports PNG, JPG, WebP (max 10MB)
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Image selection interface */}
      {isSelecting && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">
            Select from linked galleries:
          </div>

          {availableImages.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 text-center border border-border/20 rounded-lg">
              No images available. Link galleries to this deliverable first.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {availableImages.map((image, index) => (
                <div
                  key={image._id || index}
                  className="relative aspect-square rounded cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group"
                  onClick={() => handleImageSelect(image._id, image.url)}
                  title={`From: ${image.galleryName}`}
                >
                  <CloudflareImage
                    src={image.url}
                    alt={`Gallery image ${index + 1}`}
                    fill
                    className="object-contain rounded"
                    variant="public"
                    showError={true}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.error(
                        "CloudflareImage error for gallery image:",
                        {
                          src: image.url,
                          currentSrc: target.src,
                          error: e.type,
                          galleryName: image.galleryName,
                          imageId: image._id,
                        }
                      );
                    }}
                  />
                  {/* Selection indicator */}
                  {deliverable.primaryImageId === image._id && (
                    <div className="absolute inset-0 bg-primary/20 rounded flex items-center justify-center">
                      <Check className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
