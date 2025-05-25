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
  CheckSquare,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { GalleryCanvasExtensionModal } from "./GalleryCanvasExtensionModal";
import { GalleryImageMatteModal } from "./GalleryImageMatteModal";
import { ImageData } from "@/app/images/columns";

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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isCanvasExtensionOpen, setIsCanvasExtensionOpen] = useState(false);
  const [isImageMatteOpen, setIsImageMatteOpen] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const { toast } = useToast();

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
    const img = new window.Image();
    img.onload = () => {
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = image.url;
  }, [image.url]);

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
      toast({
        title: "Success",
        description: "Image URL copied to clipboard",
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast({
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
          isBatchMode && isSelected && "ring-2 ring-blue-500 ring-offset-2"
        )}
      >
        <div className="relative w-full h-full">
          <Image
            src={image.url}
            alt={image.filename || "Gallery image"}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain cursor-pointer bg-muted"
            priority={false}
            onClick={handleImageClick}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          {/* Batch selection checkbox */}
          {isBatchMode && (
            <div className="absolute top-2 left-2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectionChange) {
                    onSelectionChange(!isSelected);
                  }
                }}
                className="p-1 bg-background/90 rounded-md shadow-sm hover:bg-background transition-colors"
              >
                {isSelected ? (
                  <CheckSquare className="h-5 w-5 text-blue-500" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </div>
          )}

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

          {/* Processing buttons for horizontal images - hide in batch mode */}
          {!isBatchMode && isHorizontal && (
            <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
            </div>
          )}

          {image.filename && (
            <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <p className="text-xs text-white truncate px-2">
                {image.filename}
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          <div className="relative w-full h-[80vh]">
            <Image
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
    </>
  );
}
