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
import { ImageData } from "@/lib/imageLoader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ImageCard } from "./ImageCard";

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
}

const categories = ["Exterior", "Interior", "Detail", "Action", "Studio"];

export function SimpleImageGallery({
  data,
  isLoading,
  error,
  isFetchingNextPage,
  onImageSelect,
  selectedImageId,
}: SimpleImageGalleryProps) {
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
      <div className="flex h-[200px] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageOff className="h-8 w-8" />
          <p>No images found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {data.map((image) => (
        <ImageCard
          key={image._id}
          image={image}
          onSelect={onImageSelect}
          isSelected={image._id === selectedImageId}
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
