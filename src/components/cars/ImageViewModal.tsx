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
import {
  X,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Expand,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";

interface ImageViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageData | null;
  images?: ImageData[];
  onCanvasExtension?: (image: ImageData) => void;
  onNavigate?: (image: ImageData) => void;
}

interface ImageDimensions {
  width: number;
  height: number;
}

export function ImageViewModal({
  isOpen,
  onClose,
  image,
  images = [],
  onCanvasExtension,
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
  const getOriginalImageUrl = (url: string) => {
    // If it's a Cloudflare URL, request maximum resolution
    if (url.includes("imagedelivery.net")) {
      // Instead of using /public, use explicit high-resolution parameters
      // This ensures we get the largest possible version
      const parts = url.split("/");

      // Replace the last part with high-resolution parameters
      // w=5000 requests up to 5000px width, q=100 requests maximum quality
      parts[parts.length - 1] = "w=5000,q=100";
      return parts.join("/");
    }

    return url;
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
      await navigator.clipboard.writeText(image.url);
      setCopiedUrl(true);
      toast({
        title: "Copied!",
        description: "Image URL copied to clipboard",
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
                sizes="60vw"
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

              {/* Metadata */}
              {image.metadata && Object.keys(image.metadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                    Metadata
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(image.metadata).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <span className="text-muted-foreground capitalize text-xs font-medium">
                          {key.replace(/([A-Z])/g, " $1").trim()}:
                        </span>
                        <div className="bg-muted/50 p-2 rounded text-xs font-mono break-all max-h-32 overflow-y-auto">
                          {typeof value === "object"
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
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
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
