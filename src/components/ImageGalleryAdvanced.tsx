"use client";

import React, { useState, useCallback } from "react";
import { ImageGallery } from "./ImageGallery";
import { useImages } from "@/hooks/use-images";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageGalleryAdvancedProps {
  // Data fetching props
  page?: number;
  limit?: number;
  search?: string;
  carId?: string;
  angle?: string;
  movement?: string;
  tod?: string;
  view?: string;

  // Gallery props
  className?: string;
  showZoomControls?: boolean;
  showFilters?: boolean;

  // Action handlers
  onImageSelect?: (image: any) => void;
  onCanvasExtension?: (image: any) => void;
  onImageMatte?: (image: any) => void;
  onImageCrop?: (image: any) => void;
  onImageView?: (image: any) => void;

  // Zoom props
  zoomLevel?: number;
  onZoomChange?: (level: number) => void;
}

export function ImageGalleryAdvanced({
  page = 1,
  limit = 20,
  search,
  carId,
  angle,
  movement,
  tod,
  view,
  className = "",
  showZoomControls = true,
  showFilters = false,
  onImageSelect,
  onCanvasExtension,
  onImageMatte,
  onImageCrop,
  onImageView,
  zoomLevel = 3,
  onZoomChange,
}: ImageGalleryAdvancedProps) {
  const [currentZoom, setCurrentZoom] = useState(zoomLevel);

  // Fetch images using the existing hook
  const { data, isLoading, error, mutate } = useImages({
    page,
    limit,
    search,
    carId: carId && carId !== "all" ? carId : undefined,
    angle,
    movement,
    tod,
    view,
  });

  // Convert images to the format expected by ImageGallery
  const galleryImages = (data?.images || []).map((img: any) => ({
    id: img._id || img.id,
    url: img.url,
    filename: img.filename || "",
    metadata: img.metadata || {},
    variants: img.variants || {},
    createdAt: img.createdAt || new Date().toISOString(),
    updatedAt: img.updatedAt || new Date().toISOString(),
  }));

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(5, currentZoom + 1);
    setCurrentZoom(newZoom);
    onZoomChange?.(newZoom);
  }, [currentZoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(1, currentZoom - 1);
    setCurrentZoom(newZoom);
    onZoomChange?.(newZoom);
  }, [currentZoom, onZoomChange]);

  const handleImageClick = useCallback(
    (image: any) => {
      onImageSelect?.(image);
      onImageView?.(image);
    },
    [onImageSelect, onImageView]
  );

  const zoomConfigs = {
    1: { label: "8 cols" },
    2: { label: "6 cols" },
    3: { label: "4 cols" },
    4: { label: "3 cols" },
    5: { label: "2 cols" },
  };

  return (
    <div className={cn("space-y-4", className)}>
      {showZoomControls && (
        <div className="flex justify-end items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={currentZoom === 1}
            title="Zoom out (more columns)"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-3 min-w-[60px] text-center">
            {zoomConfigs[currentZoom as keyof typeof zoomConfigs].label}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={currentZoom === 5}
            title="Zoom in (fewer columns)"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ImageGallery
        images={galleryImages}
        isEditMode={false}
        onRemoveImage={() => {}} // Read-only for now
        onImagesChange={() => {}} // Read-only for now
        uploading={false}
        uploadProgress={[]}
        showMetadata={false}
        showFilters={showFilters}
        title="Images"
        carId={carId || ""}
        isLoading={isLoading}
        zoomLevel={currentZoom}
        onImageClick={handleImageClick}
        className="min-h-[400px]"
      />
    </div>
  );
}
