import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Copy,
  Check,
  Expand,
  Palette,
  Crop,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ImageProcessingModal,
  ProcessingType,
} from "@/components/ui/image-processing";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

// Import centralized URL transformation function
import { getEnhancedImageUrl } from "@/lib/imageUtils";

interface SortableGalleryItemProps {
  id: string;
  image: {
    _id: string;
    url: string;
    filename?: string;
    metadata?: {
      description?: string;
      [key: string]: any;
    };
    carId?: string;
  };
  onDelete: (image: any) => void;
  onImageProcessed?: (originalImageId: string, newImageData: any) => void;
  galleryId?: string;
  isBatchMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (isSelected: boolean) => void;
}

interface RestoreOriginalData {
  processedImageId: string;
}

interface RestoreOriginalResponse {
  success?: boolean;
  restoredImage?: any;
  error?: string;
}

export function SortableGalleryItem({
  id,
  image,
  onDelete,
  onImageProcessed,
  galleryId,
  isBatchMode,
  isSelected,
  onSelectionChange,
}: SortableGalleryItemProps) {
  const api = useAPI();
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [processingType, setProcessingType] =
    useState<ProcessingType>("image-crop");
  const [isRestoring, setIsRestoring] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const { toast: uiToast } = useToast();

  // Move useSortable hook before any conditional returns
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  // Get enhanced URLs for different display sizes
  const thumbnailUrl = React.useMemo(() => {
    return getEnhancedImageUrl(image.url, "400", "85");
  }, [image.url]);

  const lightboxUrl = React.useMemo(() => {
    return getEnhancedImageUrl(image.url, "1200", "90");
  }, [image.url]);

  // Load image dimensions to determine if it's horizontal (for button visibility)
  React.useEffect(() => {
    if (!api) return; // Add conditional check inside async function
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🖼️ Image URL updated for ${image.filename}: ${image.url}`);
    const img = new window.Image();
    img.onload = () => {
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = image.url; // Use the ORIGINAL image URL, not the thumbnail
  }, [image.url, image.filename, api]);

  // Authentication guard moved to the end
  if (!api) {
    return null;
  }

  const isHorizontal = imageDimensions
    ? imageDimensions.width > imageDimensions.height
    : false;

  // Use consistent aspect ratio for all gallery images to prevent layout shifts
  const aspectRatio = 0.8; // 4:5 aspect ratio for consistent gallery layout

  const handleCopyUrl = async () => {
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
      setIsCopied(true);
      uiToast({
        title: "Success",
        description: "Image URL (medium quality) copied to clipboard",
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      uiToast({
        title: "Error",
        description: "Failed to copy URL to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleCanvasExtension = () => {
    setProcessingType("canvas-extension");
    setIsProcessingModalOpen(true);
  };

  const handleImageMatte = () => {
    setProcessingType("image-matte");
    setIsProcessingModalOpen(true);
  };

  const handleCrop = () => {
    setProcessingType("image-crop");
    setIsProcessingModalOpen(true);
  };

  // Check if this image is a processed image with original metadata
  const isProcessedImage = Boolean(image.metadata?.originalImage);

  // For processed images, show restore button even if original might be missing
  // The API will handle recreating the original image record if needed
  const canRestore = isProcessedImage;

  const handleRestore = async () => {
    if (!api) return; // Add conditional check inside async function
    if (!galleryId || !image.metadata?.originalImage) return;

    setIsRestoring(true);
    try {
      const requestData: RestoreOriginalData = {
        processedImageId: image._id,
      };

      const result = await api.post<RestoreOriginalResponse>(
        `galleries/${galleryId}/restore-original`,
        requestData
      );

      if (!result.success) {
        const errorMessage = result.error || "Failed to restore original image";
        throw new Error(errorMessage);
      }

      toast.success("Original image restored successfully");
      uiToast({
        title: "Success",
        description: "Original image restored successfully",
      });

      // Notify parent component of the restoration
      if (onImageProcessed && result.restoredImage) {
        onImageProcessed(image._id, result.restoredImage);
      }
    } catch (error: any) {
      console.error("Error restoring original image:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to restore original image";

      toast.error(errorMessage);
      uiToast({
        title: "Restore Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleImageClick = () => {
    if (isBatchMode && onSelectionChange) {
      onSelectionChange(!isSelected);
    } else {
      setIsLightboxOpen(true);
    }
  };

  // Convert image to ProcessableImageData format for the modals
  const imageData = {
    _id: image._id,
    url: image.url,
    filename: image.filename,
    metadata: image.metadata,
    carId: image.carId,
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip delayDuration={1000}>
          <TooltipTrigger asChild>
            <div
              ref={setNodeRef}
              style={{
                ...style,
                aspectRatio: aspectRatio.toString(),
              }}
              className={cn(
                "relative group rounded-lg overflow-hidden bg-background border border-border",
                "shadow-sm hover:shadow-md transition-all duration-200",
                isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
                isBatchMode && isSelected && "border border-gray-400 p-1",
                isBatchMode && "cursor-pointer"
              )}
              onClick={isBatchMode ? handleImageClick : undefined}
            >
              <div
                className={cn(
                  "relative w-full h-full",
                  isBatchMode && isSelected && "rounded-md overflow-hidden"
                )}
              >
                <Image
                  key={thumbnailUrl}
                  src={thumbnailUrl}
                  alt={image.filename || "Gallery image"}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-contain bg-muted cursor-pointer"
                  priority={false}
                  onClick={!isBatchMode ? handleImageClick : undefined}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                {/* Action buttons (top right, visible on hover) - hide in batch mode */}
                {!isBatchMode && (
                  <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {/* Drag handle */}
                    <button
                      {...attributes}
                      {...listeners}
                      className="p-1 bg-background/80 rounded-full hover:bg-primary/80 hover:text-white transition-colors focus:outline-none"
                      aria-label="Drag to reorder"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>

                    {/* Restore button for processed images */}
                    {canRestore && (
                      <button
                        onClick={handleRestore}
                        disabled={isRestoring}
                        className="p-1 bg-background/80 rounded-full hover:bg-orange-600/80 hover:text-white transition-colors focus:outline-none"
                        aria-label="Restore original image"
                        title="Restore original image"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}

                    {/* Crop button for all images */}
                    <button
                      onClick={handleCrop}
                      className="p-1 bg-background/80 rounded-full hover:bg-green-600/80 hover:text-white transition-colors focus:outline-none"
                      aria-label="Crop image"
                      title="Crop image"
                    >
                      <Crop className="h-4 w-4" />
                    </button>

                    {/* Canvas extension button for horizontal images */}
                    {isHorizontal && (
                      <button
                        onClick={handleCanvasExtension}
                        className="p-1 bg-background/80 rounded-full hover:bg-primary/80 hover:text-white transition-colors focus:outline-none"
                        aria-label="Extend canvas"
                        title="Extend canvas"
                      >
                        <Expand className="h-4 w-4" />
                      </button>
                    )}

                    {/* Image matte button for horizontal images */}
                    {isHorizontal && (
                      <button
                        onClick={handleImageMatte}
                        className="p-1 bg-background/80 rounded-full hover:bg-purple-600/80 hover:text-white transition-colors focus:outline-none"
                        aria-label="Create image matte"
                        title="Create image matte"
                      >
                        <Palette className="h-4 w-4" />
                      </button>
                    )}

                    {/* Copy URL button */}
                    <button
                      onClick={handleCopyUrl}
                      className="p-1 bg-background/80 rounded-full hover:bg-blue-600/80 hover:text-white transition-colors focus:outline-none"
                      aria-label="Copy URL"
                      title="Copy URL"
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => onDelete(image)}
                      className="p-1 bg-background/80 rounded-full hover:bg-destructive/80 hover:text-white transition-colors focus:outline-none"
                      aria-label="Delete image"
                      title="Delete image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Processing indicator and filename */}
                <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="flex items-center justify-between">
                    {image.filename && (
                      <p className="text-xs text-white truncate px-2 flex-1">
                        {image.filename}
                      </p>
                    )}
                    {isProcessedImage && (
                      <div className="bg-orange-500/90 text-white text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0">
                        Processed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          {isBatchMode && (
            <TooltipContent
              side="bottom"
              className="px-3 py-1 bg-black/90 text-white text-xs font-medium rounded-full border-0"
            >
              <p className="uppercase tracking-wide">
                {isSelected ? "Click to deselect" : "Click to select"}
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          <div className="relative w-full h-[80vh]">
            <Image
              key={lightboxUrl}
              src={lightboxUrl}
              alt={image.filename || "Gallery image"}
              fill
              className="object-contain"
              priority
            />
          </div>
          {(image.filename || image.metadata?.description) && (
            <div className="p-4 bg-background">
              {image.filename && (
                <p className="text-sm font-medium">{image.filename}</p>
              )}
              {image.metadata?.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {image.metadata.description}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unified Image Processing Modal */}
      {galleryId && (
        <ImageProcessingModal
          isOpen={isProcessingModalOpen}
          onClose={() => setIsProcessingModalOpen(false)}
          image={imageData}
          processingType={processingType}
          enablePreview={true}
          galleryId={galleryId}
          onImageReplaced={onImageProcessed}
        />
      )}
    </>
  );
}
