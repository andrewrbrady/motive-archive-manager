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
import { GalleryCanvasExtensionModal } from "./GalleryCanvasExtensionModal";
import { GalleryImageMatteModal } from "./GalleryImageMatteModal";
import { GalleryCropModal } from "./GalleryCropModal";
import { ImageData } from "@/app/images/columns";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

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
  const [isCanvasExtensionOpen, setIsCanvasExtensionOpen] = useState(false);
  const [isImageMatteOpen, setIsImageMatteOpen] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
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

  // Load image dimensions to determine if it's horizontal
  React.useEffect(() => {
    if (!api) return; // Add conditional check inside async function
    console.log(`🖼️ Image URL updated for ${image.filename}: ${image.url}`);
    const img = new window.Image();
    img.onload = () => {
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = image.url;
  }, [image.url, image.filename, api]);

  // Authentication guard moved to the end
  if (!api) {
    return null;
  }

  const isHorizontal = imageDimensions
    ? imageDimensions.width > imageDimensions.height
    : false;

  // Calculate native aspect ratio
  const aspectRatio = imageDimensions
    ? imageDimensions.width / imageDimensions.height
    : 16 / 9; // fallback to 16:9 while loading

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(image.url);
      setIsCopied(true);
      uiToast({
        title: "Success",
        description: "Image URL copied to clipboard",
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
    setIsCanvasExtensionOpen(true);
  };

  const handleImageMatte = () => {
    setIsImageMatteOpen(true);
  };

  const handleCrop = () => {
    setIsCropOpen(true);
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

  // Convert image to ImageData format for the modals
  const imageData: ImageData = {
    _id: image._id,
    cloudflareId: image._id, // Using _id as cloudflareId for now
    url: image.url,
    filename: image.filename || "",
    width: imageDimensions?.width || 0,
    height: imageDimensions?.height || 0,
    metadata: image.metadata || {},
    carId: image.carId || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
                  key={image.url}
                  src={image.url}
                  alt={image.filename || "Gallery image"}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-contain bg-muted cursor-pointer"
                  priority={false}
                  onClick={!isBatchMode ? handleImageClick : undefined}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                {/* Top row buttons - hide in batch mode */}
                {!isBatchMode && (
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      {...attributes}
                      {...listeners}
                      className="p-1.5 bg-background/80 rounded-full hover:bg-background shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <GripVertical className="h-4 w-4 text-foreground" />
                    </button>
                    <button
                      onClick={handleCopyUrl}
                      className="p-1.5 bg-background/80 rounded-full hover:bg-background shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => onDelete(image)}
                      className="p-1.5 bg-background/80 rounded-full hover:bg-destructive/90 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4 text-destructive hover:text-destructive-foreground" />
                    </button>
                  </div>
                )}

                {/* Processing buttons - show for all images in non-batch mode */}
                {!isBatchMode && (
                  <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {/* Restore button for processed images */}
                    {canRestore && (
                      <button
                        onClick={handleRestore}
                        disabled={isRestoring}
                        className="p-1.5 bg-orange-500/80 rounded-full hover:bg-orange-500 shadow-sm hover:shadow-md transition-all duration-200"
                        title="Restore Original Image"
                      >
                        <RotateCcw className="h-4 w-4 text-white" />
                      </button>
                    )}

                    {/* Crop button for all images */}
                    <button
                      onClick={handleCrop}
                      className="p-1.5 bg-green-500/80 rounded-full hover:bg-green-500 shadow-sm hover:shadow-md transition-all duration-200"
                      title="Crop Image"
                    >
                      <Crop className="h-4 w-4 text-white" />
                    </button>

                    {/* Canvas extension and matte buttons for horizontal images */}
                    {isHorizontal && (
                      <>
                        <button
                          onClick={handleCanvasExtension}
                          className="p-1.5 bg-blue-500/80 rounded-full hover:bg-blue-500 shadow-sm hover:shadow-md transition-all duration-200"
                          title="Extend Canvas"
                        >
                          <Expand className="h-4 w-4 text-white" />
                        </button>
                        <button
                          onClick={handleImageMatte}
                          className="p-1.5 bg-purple-500/80 rounded-full hover:bg-purple-500 shadow-sm hover:shadow-md transition-all duration-200"
                          title="Create Matte"
                        >
                          <Palette className="h-4 w-4 text-white" />
                        </button>
                      </>
                    )}
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
              key={image.url}
              src={image.url}
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

      {/* Canvas Extension Modal */}
      {galleryId && (
        <GalleryCanvasExtensionModal
          isOpen={isCanvasExtensionOpen}
          onClose={() => setIsCanvasExtensionOpen(false)}
          image={imageData}
          galleryId={galleryId}
          onImageReplaced={onImageProcessed}
        />
      )}

      {/* Image Matte Modal */}
      {galleryId && (
        <GalleryImageMatteModal
          isOpen={isImageMatteOpen}
          onClose={() => setIsImageMatteOpen(false)}
          image={imageData}
          galleryId={galleryId}
          onImageReplaced={onImageProcessed}
        />
      )}

      {/* Crop Modal */}
      {galleryId && (
        <GalleryCropModal
          isOpen={isCropOpen}
          onClose={() => setIsCropOpen(false)}
          image={imageData}
          galleryId={galleryId}
          onImageProcessed={onImageProcessed}
        />
      )}
    </>
  );
}
