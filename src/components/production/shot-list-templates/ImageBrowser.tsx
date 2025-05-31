import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import { ImageBrowserProps } from "./types";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

// TypeScript interface for API response
interface CloudflareImagesResponse {
  images: string[];
}

// Helper function to safely get thumbnail URL
const getThumbnailUrl = (thumbnail: string | undefined): string => {
  if (!thumbnail) return "";
  // Always ensure the URL ends with /public for Cloudflare Images
  return thumbnail.endsWith("/public") ? thumbnail : `${thumbnail}/public`;
};

export function ImageBrowser({ onSelectImage }: ImageBrowserProps) {
  const api = useAPI();
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication check
  if (!api) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Authenticating...</p>
      </div>
    );
  }

  useEffect(() => {
    const fetchImages = async () => {
      if (!api) return;

      try {
        setIsLoading(true);
        setError(null);

        const data =
          await api.get<CloudflareImagesResponse>("cloudflare/images");
        setImages(data.images || []);
      } catch (error) {
        console.error("Error fetching images:", error);
        setError("Failed to load images. Please try again later.");
        toast.error("Failed to load images");
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [api]);

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
