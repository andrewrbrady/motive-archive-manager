import React, { useState, useEffect } from "react";
import { ImageData } from "@/app/images/columns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  X,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Expand,
  ExternalLink,
  Palette,
  Crop,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import { getEnhancedImageUrl } from "@/lib/imageUtils";

interface ImageViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageData | null;
  images?: ImageData[];
  onCanvasExtension?: (image: ImageData) => void;
  onImageMatte?: (image: ImageData) => void;
  onImageCrop?: (image: ImageData) => void;
  onNavigate?: (image: ImageData) => void;
}

interface ImageDimensions {
  width: number;
  height: number;
}

// Flexible metadata display component
function MetadataDisplay({ metadata }: { metadata: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  if (!metadata || Object.keys(metadata).length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
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
      return <span className="text-muted-foreground italic">null</span>;
    }

    if (typeof value === "boolean") {
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Yes" : "No"}
        </Badge>
      );
    }

    if (typeof value === "number") {
      return <span className="font-mono">{value.toLocaleString()}</span>;
    }

    if (typeof value === "string") {
      // Handle URLs
      if (value.startsWith("http")) {
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
          >
            {value}
          </a>
        );
      }

      // Handle very long strings
      if (value.length > 100) {
        return (
          <div className="space-y-2">
            <div className="bg-muted/50 p-2 rounded text-xs font-mono break-all max-h-32 overflow-y-auto">
              {value}
            </div>
          </div>
        );
      }

      return <span className="break-all">{value}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return (
          <span className="text-muted-foreground italic">Empty array</span>
        );
      }

      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {index + 1}
              </Badge>
              <span className="text-xs">{formatValue(item)}</span>
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === "object") {
      return (
        <div className="bg-muted/50 p-2 rounded text-xs font-mono break-all max-h-32 overflow-y-auto">
          <pre>{JSON.stringify(value, null, 2)}</pre>
        </div>
      );
    }

    return <span className="break-all">{String(value)}</span>;
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
    <div className="space-y-4">
      {/* Search/Filter controls */}
      {metadataEntries.length > 5 && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="h-8"
          >
            <Search className="h-4 w-4" />
          </Button>
          {showSearch && (
            <Input
              placeholder="Search metadata..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs"
            />
          )}
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="h-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Metadata entries */}
      <div className="space-y-3">
        {sortedEntries.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No metadata matches your search
          </div>
        ) : (
          sortedEntries.map(([key, value]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs font-medium">
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
              <div className="bg-muted/50 p-2 rounded text-xs">
                {formatValue(value)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Metadata summary */}
      <div className="pt-2 border-t">
        <div className="text-xs text-muted-foreground">
          {filteredEntries.length} of {metadataEntries.length} fields
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      </div>
    </div>
  );
}

export function ImageViewModal({
  isOpen,
  onClose,
  image,
  images = [],
  onCanvasExtension,
  onImageMatte,
  onImageCrop,
  onNavigate,
}: ImageViewModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedFilename, setCopiedFilename] = useState(false);
  const [imageDimensions, setImageDimensions] =
    useState<ImageDimensions | null>(null);

  // Find current image index for navigation
  const currentIndex = images.findIndex((img) => img._id === image?._id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  // Helper function to get original full-resolution image URL
  // Use centralized high-resolution URL transformation
  const getOriginalImageUrl = (url: string) => {
    return getEnhancedImageUrl(url, "3000", "90"); // Maps to highres variant (3000px)
  };

  // Get the full-resolution URL for modal display
  const fullResImageUrl = image ? getOriginalImageUrl(image.url) : null;

  // Load image dimensions
  useEffect(() => {
    if (fullResImageUrl) {
      const img = new window.Image();
      img.onload = () => {
        setImageDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = fullResImageUrl;
    }
  }, [fullResImageUrl]);

  const handleCopyUrl = async () => {
    if (!image?.url) return;
    try {
      // Normalize to medium variant for consistent quality
      let urlToCopy = image.url;

      if (image.url.includes("imagedelivery.net")) {
        // Always use medium variant for clipboard copy
        const urlParts = image.url.split("/");
        const lastPart = urlParts[urlParts.length - 1];

        // Check if the last part is a variant (alphabetic or has parameters)
        if (lastPart.match(/^[a-zA-Z]+$/) || lastPart.includes("=")) {
          // Replace with medium variant
          urlParts[urlParts.length - 1] = "medium";
        } else {
          // No variant specified, append medium
          urlParts.push("medium");
        }

        urlToCopy = urlParts.join("/");
      }

      await navigator.clipboard.writeText(urlToCopy);
      setCopiedUrl(true);
      toast({
        title: "Copied!",
        description: "Image URL (medium quality) copied to clipboard",
      });
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      });
    }
  };

  const handleCopyFilename = async () => {
    if (!image?.filename) return;
    try {
      await navigator.clipboard.writeText(image.filename);
      setCopiedFilename(true);
      toast({
        title: "Copied!",
        description: "Filename copied to clipboard",
      });
      setTimeout(() => setCopiedFilename(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy filename",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!image) return;

    // Use the full-resolution URL for download
    const downloadUrl = fullResImageUrl || image.url;

    // Convert to blob for better download handling of large files
    fetch(downloadUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = image.filename || "image";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Download Started",
          description: "High-quality image download initiated",
        });
      })
      .catch(() => {
        // Fallback to direct download
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = image.filename || "image";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Download Started",
          description: "Image download initiated",
        });
      });
  };

  const handlePrevious = () => {
    if (hasPrevious && images[currentIndex - 1] && onNavigate) {
      onNavigate(images[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && images[currentIndex + 1] && onNavigate) {
      onNavigate(images[currentIndex + 1]);
    }
  };

  const handleCanvasExtension = () => {
    if (image && onCanvasExtension) {
      onCanvasExtension(image);
      onClose();
    }
  };

  const handleImageMatte = () => {
    if (image && onImageMatte) {
      onImageMatte(image);
      onClose();
    }
  };

  const handleImageCrop = () => {
    if (image && onImageCrop) {
      onImageCrop(image);
      onClose();
    }
  };

  const handleOpenInNewTab = () => {
    if (image?.url) {
      window.open(image.url, "_blank");
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          handlePrevious();
          break;
        case "ArrowRight":
          event.preventDefault();
          handleNext();
          break;
        case "Escape":
          event.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!image) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[80vw] max-h-[95vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold truncate">
              {image.filename || "Image"}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {/* Navigation buttons */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={!hasPrevious}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentIndex + 1} of {images.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={!hasNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main content - Image left, Info right */}
        <div className="flex flex-1 min-h-0">
          {/* Left side - Image */}
          <div className="flex-1 flex items-center justify-center py-8 px-6 bg-muted/30 min-h-[800px]">
            <div className="relative w-full h-full max-h-[70vh] flex items-center justify-center">
              <Image
                src={fullResImageUrl || image.url}
                alt={image.filename || "Image"}
                fill
                sizes="(max-width: 768px) 95vw, (max-width: 1200px) 800px, 1200px"
                className="object-contain"
              />
            </div>
          </div>

          {/* Right side - File info */}
          <div className="w-96 border-l bg-background flex flex-col">
            {/* Image details */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <h3 className="text-lg font-semibold mb-3">Image Details</h3>

                {/* Dimensions and date */}
                <div className="space-y-2 text-sm">
                  {imageDimensions && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dimensions:</span>
                      <span className="font-medium">
                        {imageDimensions.width} × {imageDimensions.height}
                      </span>
                    </div>
                  )}

                  {image.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">
                        {new Date(image.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Filename:</span>
                    <span
                      className="font-medium break-all text-xs bg-muted/50 p-2 rounded"
                      title={image.filename}
                    >
                      {image.filename}
                    </span>
                  </div>
                </div>
              </div>

              {/* Flexible Metadata Display */}
              {image.metadata && Object.keys(image.metadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                    Metadata
                  </h4>
                  <MetadataDisplay metadata={image.metadata} />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="p-6 border-t space-y-3 flex-shrink-0">
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyFilename}
                  className="justify-start"
                >
                  {copiedFilename ? (
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy Filename
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="justify-start"
                >
                  {copiedUrl ? (
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy URL
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInNewTab}
                  className="justify-start"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="justify-start"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>

                {onCanvasExtension && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCanvasExtension}
                    className="justify-start"
                  >
                    <Expand className="h-4 w-4 mr-2" />
                    Extend Canvas
                  </Button>
                )}

                {onImageMatte && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleImageMatte}
                    className="justify-start bg-purple-600 hover:bg-purple-700"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Create Matte
                  </Button>
                )}

                {onImageCrop && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleImageCrop}
                    className="justify-start bg-green-600 hover:bg-green-700"
                  >
                    <Crop className="h-4 w-4 mr-2" />
                    Crop Image
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
