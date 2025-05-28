import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import { ImageBrowserProps } from "./types";

// Helper function to safely get thumbnail URL
const getThumbnailUrl = (thumbnail: string | undefined): string => {
  if (!thumbnail) return "";
  // Always ensure the URL ends with /public for Cloudflare Images
  return thumbnail.endsWith("/public") ? thumbnail : `${thumbnail}/public`;
};

export function ImageBrowser({ onSelectImage }: ImageBrowserProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/cloudflare/images");
        if (!response.ok) {
          throw new Error("Failed to fetch images");
        }

        const data = await response.json();
        setImages(data.images || []);
      } catch (error) {
        console.error("Error fetching images:", error);
        setError("Failed to load images. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading images...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No images found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
      {images.map((imageUrl, index) => (
        <div
          key={index}
          className="relative w-full rounded-md overflow-hidden border border-[hsl(var(--border))] cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onSelectImage(imageUrl)}
        >
          <ResponsiveImage
            src={getThumbnailUrl(imageUrl)}
            alt={`Image ${index + 1}`}
            className="bg-muted rounded-md overflow-hidden"
          />
        </div>
      ))}
    </div>
  );
}
