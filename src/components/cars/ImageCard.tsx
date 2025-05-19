import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ImageData } from "@/lib/imageLoader";
import { Copy, Check, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface ImageCardProps {
  image: ImageData;
  onSelect?: (image: ImageData) => void;
  isSelected?: boolean;
  onDelete?: (image: ImageData) => Promise<void>;
}

export function ImageCard({
  image,
  onSelect,
  isSelected,
  onDelete,
}: ImageCardProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedFilename, setCopiedFilename] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
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

  const handleDelete = async (e: React.MouseEvent) => {
    console.log("Delete button clicked for image:", image);
    e.stopPropagation();
    if (!onDelete) return;
    setIsDeleting(true);
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

  if (onDelete) {
    console.log("Rendering delete button for image:", image);
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg cursor-pointer group",
        "aspect-[4/3] border border-border hover:shadow-md transition-all duration-200",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={() => onSelect?.(image)}
    >
      {/* Delete button (top right, visible on hover) */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 z-20 p-1 bg-background/80 rounded-full hover:bg-destructive/80 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
          aria-label="Delete image"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      )}
      <Image
        src={image.url}
        alt={image.filename || "Car image"}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
