import React from "react";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import { ChevronLeft, ChevronRight, ZoomIn, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExtendedImageType } from "@/types/gallery";
import { getEnhancedImageUrlBySize } from "@/lib/imageUtils";

interface ImageViewerProps {
  currentImage: ExtendedImageType | undefined;
  onNext: () => void;
  onPrev: () => void;
  onOpenModal: () => void;
  onToggleInfo: () => void;
  showImageInfo: boolean;
  onReanalyze: (imageId: string) => void;
}

export function ImageViewer({
  currentImage,
  onNext,
  onPrev,
  onOpenModal,
  onToggleInfo,
  showImageInfo,
  onReanalyze,
}: ImageViewerProps) {
  // No fallback needed since gallery handles conditional rendering
  return (
    <div className="bg-background rounded-lg h-full">
      <div className="relative w-full h-full">
        <CloudflareImage
          src={getEnhancedImageUrlBySize(currentImage!.url, "large")}
          alt={currentImage!.metadata?.description || `Image`}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 800px, 1500px"
          priority
        />

        {/* Navigation Controls */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Previous button clicked");
            onPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors z-10"
          title="Previous image"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Next button clicked");
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors z-10"
          title="Next image"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Top right controls */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={onToggleInfo}
            className={cn(
              "p-2 rounded-full text-white transition-colors",
              showImageInfo
                ? "bg-primary/80 hover:bg-primary"
                : "bg-black/50 hover:bg-black/70"
            )}
            title="Toggle image info"
          >
            <Info className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenModal}
            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            title="View full size"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
