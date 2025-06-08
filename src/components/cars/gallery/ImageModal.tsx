import React, { useEffect, useCallback } from "react";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Info,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExtendedImageType } from "@/types/gallery";
import { getEnhancedImageUrlBySize } from "@/lib/imageUtils";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: ExtendedImageType | undefined;
  images?: ExtendedImageType[];
  onNext?: () => void;
  onPrev?: () => void;
  showImageInfo?: boolean;
  onToggleInfo?: () => void;
  onCopyUrl?: (useHighestQuality?: boolean) => void;
}

export function ImageModal({
  isOpen,
  onClose,
  currentImage,
  images = [],
  onNext,
  onPrev,
  showImageInfo = false,
  onToggleInfo,
  onCopyUrl,
}: ImageModalProps) {
  // Find current image index for navigation
  const currentIndex = images.findIndex(
    (img) => (img.id || img._id) === (currentImage?.id || currentImage?._id)
  );
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  // Keyboard navigation in lightbox mode
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      const isShiftPressed = event.shiftKey;
      const key = event.key;

      // Handle Shift + Key combinations
      if (isShiftPressed) {
        switch (key.toLowerCase()) {
          case "i":
            event.preventDefault();
            onToggleInfo?.();
            break;

          case "c":
            event.preventDefault();
            onCopyUrl?.(false); // Standard quality in lightbox
            break;
        }
        return;
      }

      // Handle regular keys
      switch (key) {
        case "ArrowLeft":
          event.preventDefault();
          if (hasPrevious && onPrev) {
            onPrev();
          }
          break;

        case "ArrowRight":
          event.preventDefault();
          if (hasNext && onNext) {
            onNext();
          }
          break;

        case "Escape":
          event.preventDefault();
          onClose();
          break;
      }
    },
    [
      isOpen,
      hasPrevious,
      hasNext,
      onNext,
      onPrev,
      onClose,
      onToggleInfo,
      onCopyUrl,
    ]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!currentImage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0">
        <DialogTitle className="sr-only">Full size image view</DialogTitle>
        <div className="relative w-full h-[90vh] bg-black">
          {/* Main Image */}
          <CloudflareImage
            src={getEnhancedImageUrlBySize(currentImage.url, "fullsize")}
            alt={currentImage.metadata?.description || "Full size image"}
            fill
            className="object-contain"
            sizes="95vw"
            variant="large"
          />

          {/* Top Controls */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
            {/* Image counter */}
            {images.length > 1 && (
              <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} of {images.length}
              </div>
            )}

            {/* Control buttons */}
            <div className="flex gap-2">
              {onToggleInfo && (
                <button
                  onClick={onToggleInfo}
                  className={cn(
                    "p-2 rounded-full text-white transition-colors",
                    showImageInfo
                      ? "bg-primary/80 hover:bg-primary"
                      : "bg-black/50 hover:bg-black/70"
                  )}
                  title="Toggle image info (Shift+I)"
                >
                  <Info className="w-5 h-5" />
                </button>
              )}

              {onCopyUrl && (
                <button
                  onClick={() => onCopyUrl(false)}
                  className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  title="Copy image URL (Shift+C)"
                >
                  <Copy className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                title="Close (Escape)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              {/* Previous button */}
              <button
                onClick={onPrev}
                disabled={!hasPrevious}
                className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full text-white transition-colors z-20",
                  hasPrevious
                    ? "bg-black/50 hover:bg-black/70"
                    : "bg-black/20 text-white/40 cursor-not-allowed"
                )}
                title="Previous image (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Next button */}
              <button
                onClick={onNext}
                disabled={!hasNext}
                className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full text-white transition-colors z-20",
                  hasNext
                    ? "bg-black/50 hover:bg-black/70"
                    : "bg-black/20 text-white/40 cursor-not-allowed"
                )}
                title="Next image (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Image Info Panel */}
          {showImageInfo && currentImage && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/90 text-white p-6 z-20">
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Image Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      {currentImage.filename && (
                        <div>
                          <span className="text-gray-400">Filename:</span>
                          <span className="ml-2">{currentImage.filename}</span>
                        </div>
                      )}
                      {currentImage.metadata?.description && (
                        <div>
                          <span className="text-gray-400">Description:</span>
                          <span className="ml-2">
                            {currentImage.metadata.description}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Metadata</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {currentImage.metadata?.angle && (
                        <div>
                          <span className="text-gray-400">Angle:</span>
                          <span className="ml-2">
                            {currentImage.metadata.angle}
                          </span>
                        </div>
                      )}
                      {currentImage.metadata?.view && (
                        <div>
                          <span className="text-gray-400">View:</span>
                          <span className="ml-2">
                            {currentImage.metadata.view}
                          </span>
                        </div>
                      )}
                      {currentImage.metadata?.movement && (
                        <div>
                          <span className="text-gray-400">Movement:</span>
                          <span className="ml-2">
                            {currentImage.metadata.movement}
                          </span>
                        </div>
                      )}
                      {currentImage.metadata?.tod && (
                        <div>
                          <span className="text-gray-400">Time of Day:</span>
                          <span className="ml-2">
                            {currentImage.metadata.tod}
                          </span>
                        </div>
                      )}
                      {currentImage.metadata?.side && (
                        <div>
                          <span className="text-gray-400">Side:</span>
                          <span className="ml-2">
                            {currentImage.metadata.side}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="absolute bottom-4 right-4 text-white/70 text-xs bg-black/50 px-3 py-2 rounded z-20">
            <div className="flex gap-3">
              <span>←/→ Navigate</span>
              <span>Shift+I Info</span>
              <span>Shift+C Copy</span>
              <span>Esc Close</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
