import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ImageData } from "@/app/images/columns";
import {
  Copy,
  Check,
  Trash2,
  Loader2,
  Expand,
  Palette,
  Crop,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface ImageCardProps {
  image: ImageData;
  onSelect?: (image: ImageData) => void;
  isSelected?: boolean;
  onDelete?: (image: ImageData) => Promise<void>;
  onCanvasExtension?: (image: ImageData) => void;
  onImageMatte?: (image: ImageData) => void;
  onImageCrop?: (image: ImageData) => void;
  onImageView?: (image: ImageData) => void;
}

// Helper function to build enhanced Cloudflare URL for thumbnails - FIXED
const getThumbnailImageUrl = (baseUrl: string) => {
  if (!baseUrl.includes("imagedelivery.net")) {
    return baseUrl;
  }

  // Map 600px to the appropriate named variant (medium: 600x400)
  const targetVariant = "medium";

  const urlParts = baseUrl.split("/");

  // If URL already has a variant, replace it
  if (urlParts.length >= 5) {
    const lastPart = urlParts[urlParts.length - 1];

    // If it's a named variant or flexible variant, replace it
    if (lastPart.match(/^[a-zA-Z]+$/) || lastPart.includes("=")) {
      urlParts[urlParts.length - 1] = targetVariant;
      return urlParts.join("/");
    }
  }

  // URL doesn't have a variant, append the named variant
  return `${baseUrl}/${targetVariant}`;
};

export function ImageCard({
  image,
  onSelect,
  isSelected,
  onDelete,
  onCanvasExtension,
  onImageMatte,
  onImageCrop,
  onImageView,
}: ImageCardProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedFilename, setCopiedFilename] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
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

  const handleCopyFilename = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    try {
      await navigator.clipboard.writeText(image.filename || "");
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

  const handleDelete = (e: React.MouseEvent) => {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Delete button clicked for image:", image);
    e.stopPropagation();
    if (!onDelete) return;

    // Immediate optimistic feedback
    setIsDeleting(true);
    toast({
      title: "Deleting...",
      description: "Image deletion in progress",
    });

    // Background delete operation - non-blocking
    const deleteOperation = async () => {
      try {
        await onDelete(image);
        toast({
          title: "Deleted!",
          description: "Image deleted successfully",
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to delete image",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
      }
    };

    // Execute delete in background - non-blocking
    setTimeout(deleteOperation, 0);
  };

  const handleCanvasExtension = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCanvasExtension?.(image);
  };

  const handleImageMatte = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageMatte?.(image);
  };

  const handleImageCrop = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageCrop?.(image);
  };

  if (onDelete) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Rendering delete button for image:", image);
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg cursor-pointer group",
        "border border-border hover:shadow-md transition-all duration-200",
        "min-h-[200px] max-h-[400px] flex items-center",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={() => onImageView?.(image)}
    >
      {/* Action buttons (top right, visible on hover) */}
      <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {/* Canvas Extension button */}
        {onCanvasExtension && (
          <button
            onClick={handleCanvasExtension}
            className="p-1 bg-background/80 rounded-full hover:bg-primary/80 hover:text-white transition-colors focus:outline-none"
            aria-label="Extend canvas"
            title="Extend canvas"
          >
            <Expand className="h-4 w-4" />
          </button>
        )}

        {/* Image Matte button */}
        {onImageMatte && (
          <button
            onClick={handleImageMatte}
            className="p-1 bg-background/80 rounded-full hover:bg-purple-600/80 hover:text-white transition-colors focus:outline-none"
            aria-label="Create image matte"
            title="Create image matte"
          >
            <Palette className="h-4 w-4" />
          </button>
        )}

        {/* Image Crop button */}
        {onImageCrop && (
          <button
            onClick={handleImageCrop}
            className="p-1 bg-background/80 rounded-full hover:bg-orange-600/80 hover:text-white transition-colors focus:outline-none"
            aria-label="Crop image"
            title="Crop image"
          >
            <Crop className="h-4 w-4" />
          </button>
        )}

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="p-1 bg-background/80 rounded-full hover:bg-destructive/80 hover:text-white transition-colors focus:outline-none"
            aria-label="Delete image"
            title="Delete image"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      <Image
        src={getThumbnailImageUrl(image.url)}
        alt={image.filename || "Car image"}
        width={0}
        height={0}
        className="w-full h-auto object-contain min-h-[200px] max-h-[400px]"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        style={{ width: "100%", height: "auto" }}
      />

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Hover info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-1.5 text-white">
        {/* Filename row */}
        {image.filename && (
          <div className="flex items-center justify-between">
            <p className="text-xs truncate flex-1 px-1">{image.filename}</p>
            <button
              onClick={handleCopyFilename}
              className="p-1 bg-background/30 rounded-full hover:bg-background/50 transition-colors"
              aria-label="Copy filename"
            >
              {copiedFilename ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}

        {/* URL row */}
        <div className="flex items-center justify-between">
          <p className="text-xs truncate flex-1 px-1">
            {image.url.substring(0, 35)}...
          </p>
          <button
            onClick={handleCopyUrl}
            className="p-1 bg-background/30 rounded-full hover:bg-background/50 transition-colors"
            aria-label="Copy URL"
          >
            {copiedUrl ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Metadata badge */}
      {image.metadata?.angle && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
          {image.metadata.angle}
        </div>
      )}
    </div>
  );
}
