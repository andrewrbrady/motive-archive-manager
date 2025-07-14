"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Images,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface GalleryImage {
  id: string;
  url: string;
  filename: string;
  metadata: {
    angle?: string;
    view?: string;
    movement?: string;
    tod?: string;
    side?: string;
    description?: string;
    category?: string;
    isPrimary?: boolean;
    [key: string]: any;
  };
  galleryName?: string;
}

interface ProjectGallery {
  _id: string;
  name: string;
  description?: string;
  imageIds: string[];
  imageCount: number;
  thumbnailImage?: {
    _id: string;
    url: string;
    filename?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface GallerySelectionProps {
  projectGalleries: ProjectGallery[];
  selectedGalleryIds: string[];
  loadingGalleries: boolean;
  onGallerySelection: (galleryId: string) => void;
  onSelectAllGalleries: () => void;
  // Optional load more functionality
  hasMoreGalleries?: boolean;
  onLoadMoreGalleries?: () => void;
  // Collapsible props
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  // Gallery images for rich metadata display
  galleryImages?: GalleryImage[];
}

export function GallerySelection({
  projectGalleries,
  selectedGalleryIds,
  loadingGalleries,
  onGallerySelection,
  onSelectAllGalleries,
  hasMoreGalleries = false,
  onLoadMoreGalleries,
  isOpen = true,
  onToggle,
  galleryImages = [],
}: GallerySelectionProps) {
  const getSelectedImageCount = (galleryId: string) => {
    return galleryImages.filter((img) =>
      projectGalleries
        .find((g) => g._id === galleryId)
        ?.imageIds.includes(img.id)
    ).length;
  };

  const getGalleryMetadataPreview = (galleryId: string) => {
    const gallery = projectGalleries.find((g) => g._id === galleryId);
    if (!gallery) return { angles: [], views: [], movements: [] };

    const galleryImageData = galleryImages.filter((img) =>
      gallery.imageIds.includes(img.id)
    );

    const angles = [
      ...new Set(
        galleryImageData.map((img) => img.metadata.angle).filter(Boolean)
      ),
    ];
    const views = [
      ...new Set(
        galleryImageData.map((img) => img.metadata.view).filter(Boolean)
      ),
    ];
    const movements = [
      ...new Set(
        galleryImageData.map((img) => img.metadata.movement).filter(Boolean)
      ),
    ];

    return { angles, views, movements };
  };

  const renderContent = () => {
    if (loadingGalleries && projectGalleries.length === 0) {
      return (
        <div className="text-sm text-[hsl(var(--foreground-muted))]">
          Loading galleries...
        </div>
      );
    }

    if (projectGalleries.length === 0) {
      return (
        <div className="text-center py-6 text-[hsl(var(--foreground-muted))]">
          <Images className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium mb-1">
            No galleries linked to project
          </p>
          <p className="text-xs">
            Link galleries to this project to include their image metadata in
            captions
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 gap-3">
          {projectGalleries.map((gallery) => {
            const isSelected = selectedGalleryIds.includes(gallery._id);
            const imageCount = getSelectedImageCount(gallery._id);
            const metadataPreview = getGalleryMetadataPreview(gallery._id);

            return (
              <button
                key={gallery._id}
                onClick={() => onGallerySelection(gallery._id)}
                className={`flex items-start space-x-3 p-3 border rounded-lg transition-all text-left w-full ${
                  isSelected
                    ? "border-blue-500 border-2"
                    : "border-[hsl(var(--border-subtle))] hover:border-white hover:bg-muted/30"
                }`}
              >
                {/* Gallery Thumbnail */}
                <div className="flex-shrink-0 mt-1">
                  {gallery.thumbnailImage ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border">
                      <img
                        src={gallery.thumbnailImage.url}
                        alt={gallery.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to gallery icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                      <div className="hidden w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Images className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Images className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[hsl(var(--foreground))] dark:text-white">
                    {gallery.name}
                  </div>
                  <div className="text-xs text-[hsl(var(--foreground-muted))] mt-1">
                    {gallery.imageCount} images
                    {gallery.description && (
                      <span>
                        {" "}
                        • {gallery.description.substring(0, 50)}
                        {gallery.description.length > 50 ? "..." : ""}
                      </span>
                    )}
                  </div>

                  {/* Metadata Preview */}
                  {imageCount > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {metadataPreview.angles.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {metadataPreview.angles.length} angle
                          {metadataPreview.angles.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {metadataPreview.views.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {metadataPreview.views.length} view
                          {metadataPreview.views.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {metadataPreview.movements.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {metadataPreview.movements.length} movement
                          {metadataPreview.movements.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {imageCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 text-green-700"
                        >
                          {imageCount} with metadata
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="text-xs text-[hsl(var(--foreground-muted))]">
                    {new Date(gallery.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Load More Galleries Button */}
        {hasMoreGalleries && onLoadMoreGalleries && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMoreGalleries}
              disabled={loadingGalleries}
              className="border-[hsl(var(--border))]"
            >
              {loadingGalleries ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                  Loading...
                </>
              ) : (
                "Load More Galleries"
              )}
            </Button>
          </div>
        )}

        {selectedGalleryIds.length > 0 && (
          <div className="text-sm text-[hsl(var(--foreground-muted))]">
            {selectedGalleryIds.length} galler
            {selectedGalleryIds.length !== 1 ? "ies" : "y"} selected
          </div>
        )}
      </>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 p-0 h-auto font-medium text-[hsl(var(--foreground))] dark:text-white hover:bg-transparent"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Images className="h-4 w-4" />
              Select Galleries for Caption
              {selectedGalleryIds.length > 0 && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {selectedGalleryIds.length}
                </span>
              )}
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAllGalleries}
            className="border-[hsl(var(--border))]"
          >
            {selectedGalleryIds.length === projectGalleries.length
              ? "Deselect All"
              : "Select All"}
          </Button>
        </div>

        <CollapsibleContent>{renderContent()}</CollapsibleContent>
      </div>
    </Collapsible>
  );
}
