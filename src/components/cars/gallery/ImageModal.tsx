import React, { useEffect, useCallback, useState } from "react";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Info,
  Download,
  Search,
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

// Flexible metadata display component for gallery images
function GalleryMetadataDisplay({ metadata }: { metadata: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  if (!metadata || Object.keys(metadata).length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No metadata available
      </div>
    );
  }

  const metadataEntries = Object.entries(metadata);
  const filteredEntries = searchTerm
    ? metadataEntries.filter(
        ([key, value]) =>
          key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : metadataEntries;

  const formatValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-500 italic">null</span>;
    }

    if (typeof value === "boolean") {
      return (
        <Badge variant={value ? "default" : "secondary"} className="text-xs">
          {value ? "Yes" : "No"}
        </Badge>
      );
    }

    if (typeof value === "number") {
      return (
        <span className="font-mono text-sm">{value.toLocaleString()}</span>
      );
    }

    if (typeof value === "string") {
      // Handle URLs
      if (value.startsWith("http")) {
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline break-all text-sm"
          >
            {value}
          </a>
        );
      }

      // Handle very long strings
      if (value.length > 80) {
        return (
          <div className="bg-black/20 p-2 rounded text-xs font-mono break-all max-h-24 overflow-y-auto">
            {value}
          </div>
        );
      }

      return <span className="break-all text-sm">{value}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return (
          <span className="text-gray-500 italic text-sm">Empty array</span>
        );
      }

      return (
        <div className="space-y-1">
          {value.slice(0, 3).map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {index + 1}
              </Badge>
              <span className="text-xs">{formatValue(item)}</span>
            </div>
          ))}
          {value.length > 3 && (
            <div className="text-xs text-gray-500">
              ... and {value.length - 3} more
            </div>
          )}
        </div>
      );
    }

    if (typeof value === "object") {
      return (
        <div className="bg-black/20 p-2 rounded text-xs font-mono break-all max-h-24 overflow-y-auto">
          <pre>{JSON.stringify(value, null, 2)}</pre>
        </div>
      );
    }

    return <span className="break-all text-sm">{String(value)}</span>;
  };

  const formatKey = (key: string): string => {
    // Convert camelCase/snake_case to Title Case
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  };

  const getPriorityOrder = (key: string): number => {
    // Define priority order for common fields
    const priorities: { [key: string]: number } = {
      description: 1,
      category: 2,
      angle: 3,
      view: 4,
      movement: 5,
      tod: 6,
      side: 7,
      primary_subject: 8,
      content_type: 9,
      style: 10,
      usage_context: 11,
      dominant_colors: 12,
      has_text: 13,
      has_brand_elements: 14,
      width: 15,
      height: 16,
      size: 17,
      format: 18,
      isPrimary: 100, // Show isPrimary at the end
    };

    return priorities[key] || 50; // Default priority for unknown fields
  };

  // Sort entries by priority, then alphabetically
  const sortedEntries = filteredEntries.sort(([keyA], [keyB]) => {
    const priorityA = getPriorityOrder(keyA);
    const priorityB = getPriorityOrder(keyB);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return keyA.localeCompare(keyB);
  });

  return (
    <div className="space-y-3">
      {/* Search/Filter controls */}
      {metadataEntries.length > 5 && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="h-7 text-white hover:bg-white/20"
          >
            <Search className="h-3 w-3" />
          </Button>
          {showSearch && (
            <Input
              placeholder="Search metadata..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 text-xs bg-black/20 border-white/20 text-white placeholder:text-gray-400"
            />
          )}
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="h-7 text-white hover:bg-white/20"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Metadata entries */}
      <div className="space-y-2">
        {sortedEntries.length === 0 ? (
          <div className="text-center text-gray-400 py-4 text-sm">
            No metadata matches your search
          </div>
        ) : (
          sortedEntries.map(([key, value]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs font-medium">
                  {formatKey(key)}:
                </span>
                {typeof value === "object" && !Array.isArray(value) && (
                  <Badge variant="outline" className="text-xs">
                    Object
                  </Badge>
                )}
                {Array.isArray(value) && (
                  <Badge variant="outline" className="text-xs">
                    Array ({value.length})
                  </Badge>
                )}
              </div>
              <div className="pl-2">{formatValue(value)}</div>
            </div>
          ))
        )}
      </div>

      {/* Metadata summary */}
      {searchTerm && (
        <div className="pt-2 border-t border-white/20">
          <div className="text-xs text-gray-400">
            {filteredEntries.length} of {metadataEntries.length} fields matching
            "{searchTerm}"
          </div>
        </div>
      )}
    </div>
  );
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
  const currentIndex = images.findIndex((img) => img.id === currentImage?.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          onPrev?.();
          break;
        case "ArrowRight":
          event.preventDefault();
          onNext?.();
          break;
        case "Escape":
          event.preventDefault();
          onClose();
          break;
        case "i":
        case "I":
          event.preventDefault();
          onToggleInfo?.();
          break;
      }
    },
    [isOpen, onPrev, onNext, onClose, onToggleInfo]
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
              <button
                onClick={onToggleInfo}
                className={cn(
                  "p-2 rounded-full text-white transition-colors",
                  showImageInfo
                    ? "bg-blue-600/80 hover:bg-blue-600"
                    : "bg-black/50 hover:bg-black/70"
                )}
                title="Toggle image info (I)"
              >
                <Info className="w-5 h-5" />
              </button>

              <button
                onClick={() => onCopyUrl?.(true)}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                title="Copy high-quality URL"
              >
                <Copy className="w-5 h-5" />
              </button>

              <button
                onClick={onClose}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={onPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors z-20"
                title="Previous image (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={onNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors z-20"
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

                  {/* Flexible Metadata */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Metadata</h3>
                    <GalleryMetadataDisplay metadata={currentImage.metadata} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
