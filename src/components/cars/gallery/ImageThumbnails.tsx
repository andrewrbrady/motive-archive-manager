import React from "react";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageInfoPanel } from "./ImageInfoPanel";
import { ExtendedImageType } from "@/types/gallery";

interface ImageThumbnailsProps {
  images: ExtendedImageType[];
  currentImage: ExtendedImageType | undefined;
  selectedImages: Set<string>;
  currentPage: number;
  isEditMode: boolean;
  showImageInfo: boolean;
  onImageSelect: (imageId: string) => void;
  onToggleSelection: (imageId: string) => void;
  onPageChange: (page: number) => void;
  onToggleInfo: (show: boolean) => void;
  onReanalyze: (imageId: string) => void;
  onSetPrimary?: (imageId: string) => void;
}

const ITEMS_PER_PAGE = 15;

export function ImageThumbnails({
  images,
  currentImage,
  selectedImages,
  currentPage,
  isEditMode,
  showImageInfo,
  onImageSelect,
  onToggleSelection,
  onPageChange,
  onToggleInfo,
  onReanalyze,
  onSetPrimary,
}: ImageThumbnailsProps) {
  // Force refresh: Updated thumbnail styling for no borders, white hover borders, and opacity changes
  const totalPages = Math.ceil(images.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const paginatedImages = images.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="w-full">
      {/* Image Info Panel - slides down and pushes thumbnails */}
      {showImageInfo && currentImage && (
        <ImageInfoPanel
          currentImage={currentImage}
          onClose={() => onToggleInfo(false)}
          onReanalyze={onReanalyze}
          onSetPrimary={onSetPrimary}
        />
      )}

      <div className="bg-background rounded-lg p-4">
        <div className="grid grid-cols-3 gap-2 max-h-[800px] overflow-y-auto">
          {paginatedImages.map((image: ExtendedImageType) => {
            // More robust current image detection
            const imageId = image.id || image._id;
            const currentImageId = currentImage?.id || currentImage?._id;
            const isCurrentImage =
              imageId && currentImageId && imageId === currentImageId;
            const isSelectedInEditMode = selectedImages.has(imageId);

            return (
              <div
                key={image._id || image.id}
                className={cn(
                  "relative rounded-md overflow-hidden cursor-pointer group transition-all duration-300",
                  isCurrentImage
                    ? "!border-2 !border-white ring-2 ring-white/20 !opacity-100"
                    : isSelectedInEditMode
                      ? "!border-2 !border-blue-500 !opacity-100"
                      : "!border-0 !opacity-60 hover:!opacity-100"
                )}
                style={{
                  border: isCurrentImage
                    ? "2px solid white"
                    : isSelectedInEditMode
                      ? "2px solid #3b82f6"
                      : "none",
                  opacity: isCurrentImage || isSelectedInEditMode ? 1 : 0.6,
                }}
                onMouseEnter={(e) => {
                  if (!isCurrentImage && !isSelectedInEditMode) {
                    e.currentTarget.style.opacity = "1";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrentImage && !isSelectedInEditMode) {
                    e.currentTarget.style.opacity = "0.6";
                  }
                }}
                onClick={() => onImageSelect(image.id || image._id)}
              >
                <div className="relative overflow-hidden">
                  <CloudflareImage
                    src={image.url}
                    alt={image.metadata?.description || "Thumbnail"}
                    width={140}
                    height={105}
                    className="object-cover transition-transform duration-300 group-hover:scale-110 w-full h-auto"
                    sizes="140px"
                    variant="thumbnail"
                  />
                </div>

                {/* Selection overlay for edit mode */}
                {isEditMode && (
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center transition-opacity",
                      selectedImages.has(image.id || image._id)
                        ? "opacity-100 bg-black/50"
                        : "opacity-0 bg-black/0 group-hover:opacity-100 group-hover:bg-black/30"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelection(image.id || image._id);
                    }}
                  >
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                )}

                {/* Primary image indicator */}
                {image.metadata?.isPrimary && (
                  <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
                    <Star className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <Button
              onClick={() => onPageChange(Math.max(0, currentPage - 1))}
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              onClick={() =>
                onPageChange(Math.min(totalPages - 1, currentPage + 1))
              }
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
