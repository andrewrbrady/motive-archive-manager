import React, { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useImages } from "@/hooks/use-images";
import { useCars } from "@/lib/hooks/query/useCars";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ImageOff, AlertCircle } from "lucide-react";
import { useDebounce } from "use-debounce";
import InfiniteScroll from "react-infinite-scroll-component";
import { ImageLightbox } from "./ImageLightbox";
import { ImageData } from "@/app/images/columns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ImageCard } from "./ImageCard";
import { toast } from "@/components/ui/use-toast";

interface Car {
  _id: string;
  year: string;
  make: string;
  model: string;
}

interface ImageFilters {
  angle?: string;
  movement?: string;
  timeOfDay?: string;
  view?: string;
  carId?: string;
  page?: number;
  search?: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface UseImagesResponse {
  data: {
    images: ImageData[];
    pagination: PaginationData;
  } | null;
  isLoading: boolean;
  error: Error | null;
  setFilter: (type: string, value: string | null) => void;
}

interface SimpleImageGalleryProps {
  data?: ImageData[];
  isLoading?: boolean;
  error?: Error;
  isFetchingNextPage?: boolean;
  onImageSelect?: (image: ImageData) => void;
  selectedImageId?: string;
  filters?: Record<string, string | boolean>;
  setFilter?: (key: string, value: string | boolean) => void;
  onCanvasExtension?: (image: ImageData) => void;
  onImageMatte?: (image: ImageData) => void;
  onImageCrop?: (image: ImageData) => void;
  onImageView?: (image: ImageData) => void;
  zoomLevel?: number;
  mutate?: () => void;
}

const categories = ["Exterior", "Interior", "Detail", "Action", "Studio"];

const extractCloudflareId = (url: string): string | undefined => {
  // Example: https://imagedelivery.net/<account_hash>/<cloudflare_id>/public
  const match = url.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
  return match ? match[1] : undefined;
};

export function SimpleImageGallery({
  data,
  isLoading,
  error,
  isFetchingNextPage,
  onImageSelect,
  selectedImageId,
  onCanvasExtension,
  onImageMatte,
  onImageCrop,
  onImageView,
  zoomLevel,
  mutate,
}: SimpleImageGalleryProps) {
  // Zoom level configurations
  const zoomConfigs = {
    1: "xl:grid-cols-8",
    2: "xl:grid-cols-6",
    3: "xl:grid-cols-4",
    4: "xl:grid-cols-3",
    5: "xl:grid-cols-2",
  };

  // Get grid classes based on zoom level
  const getGridClasses = () => {
    const baseClasses = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    const zoomClass = zoomLevel
      ? zoomConfigs[zoomLevel as keyof typeof zoomConfigs]
      : "xl:grid-cols-4";
    return `${baseClasses} ${zoomClass} gap-6`;
  };

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p>Failed to load images</p>
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageOff className="h-12 w-12 mb-2" />
          <p className="text-lg font-medium">No images found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  const handleDelete = async (image: ImageData) => {
    // Try to use cloudflareId, else extract from URL
    const cloudflareId = image.cloudflareId || extractCloudflareId(image.url);
    if (!cloudflareId) {
      toast({
        title: "Error",
        description: "No Cloudflare ID found for this image.",
        variant: "destructive",
      });
      return;
    }
    try {
      const payload = { cloudflareIds: [cloudflareId] };
      // [REMOVED] // [REMOVED] console.log("Sending DELETE payload to /api/cloudflare/images:", payload);
      const res = await fetch("/api/cloudflare/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      // [REMOVED] // [REMOVED] console.log("Delete response from /api/cloudflare/images:", result);
      if (!res.ok || !result.success) {
        throw new Error(result.error || JSON.stringify(result));
      }
      toast({ title: "Deleted!", description: "Image deleted successfully" });
      if (mutate) {
        mutate();
      }
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={getGridClasses()}>
      {data.map((image) => (
        <ImageCard
          key={image._id}
          image={image}
          onSelect={onImageSelect}
          isSelected={image._id === selectedImageId}
          onDelete={handleDelete}
          onCanvasExtension={onCanvasExtension}
          onImageView={onImageView}
          onImageMatte={onImageMatte}
          onImageCrop={onImageCrop}
        />
      ))}
      {isFetchingNextPage && (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
