import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { FilterState, ExtendedImageType } from "@/types/gallery";
import { useFastRouter } from "@/lib/navigation/simple-cache";
import { useAPI, useAPIStatus } from "@/hooks/useAPI";
import { useDebounce } from "@/hooks/useDebounce"; // Import useDebounce for search input
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { SelectedCopy } from "@/components/content-studio/types";

// Helper function to normalize image URLs to medium variant
const getMediumVariantUrl = (baseUrl: string): string => {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 URL normalization input:", baseUrl);

  if (!baseUrl || !baseUrl.includes("imagedelivery.net")) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Non-Cloudflare URL, returning as-is:", baseUrl);
    return baseUrl;
  }

  // Always use 'medium' variant for consistent dimensions and quality
  const urlParts = baseUrl.split("/");
  const lastPart = urlParts[urlParts.length - 1];

  // Check if the last part is a variant (alphabetic or has parameters)
  if (lastPart.match(/^[a-zA-Z]+$/) || lastPart.includes("=")) {
    // Replace with medium variant
    urlParts[urlParts.length - 1] = "medium";
  } else {
    // No variant specified, append medium
    urlParts.push("medium");
  }

  const normalizedUrl = urlParts.join("/");
  console.log("🔄 URL normalization result:", {
    original: baseUrl,
    normalized: normalizedUrl,
    wasNormalized: baseUrl !== normalizedUrl,
  });

  return normalizedUrl;
};

// Enhanced caching utilities for image gallery
interface ImageGalleryCacheItem {
  data: {
    images: ExtendedImageType[];
    pagination?: {
      totalImages?: number;
      totalPages?: number;
      currentPage?: number;
    };
  };
  timestamp: number;
  carLastModified?: number;
  filters: string; // Serialized filters for cache key
  searchQuery: string;
}

interface ImageMetadataCache {
  [imageId: string]: {
    metadata: any;
    timestamp: number;
  };
}

const CACHE_PREFIX = "img_gallery_";
const METADATA_CACHE_PREFIX = "img_meta_";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for API responses
const METADATA_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for metadata

// Enhanced cache utilities
const cacheUtils = {
  // Cache API responses with filter-based keys
  setCacheData: (
    carId: string,
    filters: FilterState,
    searchQuery: string,
    data: any,
    carLastModified?: number
  ) => {
    try {
      const filterKey = JSON.stringify(filters);
      const cacheKey = `${CACHE_PREFIX}${carId}_${btoa(filterKey)}_${btoa(searchQuery || "")}`;

      const cacheItem: ImageGalleryCacheItem = {
        data,
        timestamp: Date.now(),
        carLastModified,
        filters: filterKey,
        searchQuery,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📦 Cached gallery data:", { carId, filters, searchQuery });
    } catch (error) {
      console.warn("Failed to cache gallery data:", error);
    }
  },

  // Get cached API responses
  getCacheData: (
    carId: string,
    filters: FilterState,
    searchQuery: string,
    carLastModified?: number
  ) => {
    try {
      const filterKey = JSON.stringify(filters);
      const cacheKey = `${CACHE_PREFIX}${carId}_${btoa(filterKey)}_${btoa(searchQuery || "")}`;

      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const cacheItem: ImageGalleryCacheItem = JSON.parse(cached);
      const now = Date.now();

      // Check if cache has expired
      if (now - cacheItem.timestamp > CACHE_DURATION) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      // Check if car has been modified since cache
      if (
        carLastModified &&
        cacheItem.carLastModified &&
        carLastModified > cacheItem.carLastModified
      ) {
        localStorage.removeItem(cacheKey);
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 Cache invalidated due to car modification");
        return null;
      }

      console.log("💾 Using cached gallery data:", {
        carId,
        filters,
        searchQuery,
      });
      return cacheItem.data;
    } catch (error) {
      console.warn("Failed to read cached gallery data:", error);
      return null;
    }
  },

  // Cache image metadata
  setImageMetadata: (imageId: string, metadata: any) => {
    try {
      const metadataCache: ImageMetadataCache = JSON.parse(
        localStorage.getItem(`${METADATA_CACHE_PREFIX}metadata`) || "{}"
      );

      metadataCache[imageId] = {
        metadata,
        timestamp: Date.now(),
      };

      localStorage.setItem(
        `${METADATA_CACHE_PREFIX}metadata`,
        JSON.stringify(metadataCache)
      );
    } catch (error) {
      console.warn("Failed to cache image metadata:", error);
    }
  },

  // Get cached image metadata
  getImageMetadata: (imageId: string) => {
    try {
      const metadataCache: ImageMetadataCache = JSON.parse(
        localStorage.getItem(`${METADATA_CACHE_PREFIX}metadata`) || "{}"
      );

      const cached = metadataCache[imageId];
      if (!cached) return null;

      const now = Date.now();
      if (now - cached.timestamp > METADATA_CACHE_DURATION) {
        delete metadataCache[imageId];
        localStorage.setItem(
          `${METADATA_CACHE_PREFIX}metadata`,
          JSON.stringify(metadataCache)
        );
        return null;
      }

      return cached.metadata;
    } catch (error) {
      console.warn("Failed to read cached image metadata:", error);
      return null;
    }
  },

  // Clear cache for a specific car
  clearCarCache: (carId: string) => {
    try {
      const keys = Object.keys(localStorage);
      const carCacheKeys = keys.filter((key) =>
        key.startsWith(`${CACHE_PREFIX}${carId}_`)
      );

      carCacheKeys.forEach((key) => localStorage.removeItem(key));
      console.log(
        `🗑️ Cleared cache for car ${carId}: ${carCacheKeys.length} entries`
      );
    } catch (error) {
      console.warn("Failed to clear car cache:", error);
    }
  },

  // Clear all expired cache entries
  clearExpiredCache: () => {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      let clearedCount = 0;

      keys.forEach((key) => {
        if (key.startsWith(CACHE_PREFIX)) {
          try {
            const cached = JSON.parse(localStorage.getItem(key) || "{}");
            if (cached.timestamp && now - cached.timestamp > CACHE_DURATION) {
              localStorage.removeItem(key);
              clearedCount++;
            }
          } catch {
            localStorage.removeItem(key);
            clearedCount++;
          }
        }
      });

      if (clearedCount > 0) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🧹 Cleared ${clearedCount} expired cache entries`);
      }
    } catch (error) {
      console.warn("Failed to clear expired cache:", error);
    }
  },

  // Invalidate cache when images are modified
  invalidateImageCache: (carId: string, imageId?: string) => {
    try {
      if (imageId) {
        // Clear metadata cache for specific image
        const metadataCache: ImageMetadataCache = JSON.parse(
          localStorage.getItem(`${METADATA_CACHE_PREFIX}metadata`) || "{}"
        );
        delete metadataCache[imageId];
        localStorage.setItem(
          `${METADATA_CACHE_PREFIX}metadata`,
          JSON.stringify(metadataCache)
        );
      }

      // Clear all gallery cache for the car
      cacheUtils.clearCarCache(carId);
      console.log(
        `🔄 Invalidated cache for car ${carId}${imageId ? ` and image ${imageId}` : ""}`
      );
    } catch (error) {
      console.warn("Failed to invalidate image cache:", error);
    }
  },
};

// Export cache utilities for external use
export const imageGalleryCacheUtils = cacheUtils;

export interface EnrichedImage {
  id: string;
  imageUrl: string;
  alt: string;
  galleryName: string;
  order?: number;
  filename?: string;
  url?: string;
}

/**
 * Custom hook for handling image gallery operations in BlockComposer
 * Extracted from BlockComposer.tsx to reduce file size and improve maintainability
 */
export function useImageGallery(selectedCopies: SelectedCopy[]) {
  // Determine context for image gallery
  const carId = selectedCopies[0]?.carId;
  const projectId = selectedCopies[0]?.projectId;

  // For projects: fetch linked galleries first, then extract images from them
  // For cars: fetch images directly from the car
  const galleriesUrl = projectId ? `projects/${projectId}/galleries` : null;
  const carImagesUrl = carId && !projectId ? `cars/${carId}/images` : null;

  const {
    data: galleriesData,
    isLoading: loadingGalleries,
    refetch: refetchGalleries,
  } = useAPIQuery<{ galleries: any[] }>(galleriesUrl || "null-query", {
    enabled: Boolean(galleriesUrl),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const {
    data: carImagesData,
    isLoading: loadingCarImages,
    refetch: refetchCarImages,
  } = useAPIQuery<{ images: any[] }>(carImagesUrl || "null-query", {
    enabled: Boolean(carImagesUrl),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Extract all images from linked galleries (for projects) - OPTIMIZED
  const galleryImages = useMemo(() => {
    if (!galleriesData?.galleries) return [];

    const images: any[] = [];
    galleriesData.galleries.forEach((gallery) => {
      // Use orderedImages if available for proper ordering, fallback to imageIds
      const imageList =
        gallery.orderedImages?.length > 0
          ? gallery.orderedImages.map((item: any) => ({
              id: item.id,
              order: item.order,
              galleryName: gallery.name,
            }))
          : gallery.imageIds?.map((id: string, index: number) => ({
              id,
              order: index,
              galleryName: gallery.name,
            })) || [];

      images.push(...imageList);
    });

    return images.sort((a, b) => a.order - b.order);
  }, [galleriesData?.galleries]);

  // Extract unique image IDs to fetch actual image data (for projects)
  const imageIds = useMemo(() => {
    return [...new Set(galleryImages.map((img) => img.id))];
  }, [galleryImages]);

  // Fetch actual image data for the image IDs (for projects)
  const { data: imageMetadata, isLoading: loadingImageData } = useAPIQuery<
    any[]
  >(
    imageIds.length > 0
      ? `images/metadata?ids=${imageIds.join(",")}`
      : "null-query",
    {
      enabled: imageIds.length > 0,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
    }
  );

  // Combine gallery context with image data (for projects) - OPTIMIZED
  const enrichedGalleryImages = useMemo((): EnrichedImage[] => {
    if (!imageMetadata || !galleryImages.length) return [];

    // Create a map of image ID to metadata for O(1) lookup instead of nested loops
    const imageDataMap = new Map(
      imageMetadata.map((img) => [img.imageId || img._id, img])
    );

    // Enrich gallery images with actual image data
    return galleryImages
      .map((galleryImg) => {
        const imageData = imageDataMap.get(galleryImg.id);
        if (!imageData) return null;

        return {
          ...imageData,
          id: galleryImg.id,
          order: galleryImg.order,
          galleryName: galleryImg.galleryName,
          // Ensure we have proper URL and alt text for the UI with proper Cloudflare formatting
          imageUrl: fixCloudflareImageUrl(imageData.url),
          alt: imageData.filename || `Image from ${galleryImg.galleryName}`,
        };
      })
      .filter(Boolean) as EnrichedImage[];
  }, [imageMetadata, galleryImages]);

  // Process car images (for cars) - OPTIMIZED
  const carImages = useMemo((): EnrichedImage[] => {
    if (!carImagesData?.images) return [];

    return carImagesData.images.map((image: any, index: number) => ({
      ...image,
      id: image._id || image.id,
      imageUrl: fixCloudflareImageUrl(image.url),
      alt: image.filename || `Car image ${index + 1}`,
      galleryName: "Car Images",
    }));
  }, [carImagesData?.images]);

  // Final images list: use project galleries or car images - OPTIMIZED with proper dependencies
  const finalImages = useMemo((): EnrichedImage[] => {
    return projectId ? enrichedGalleryImages : carImages;
  }, [projectId, enrichedGalleryImages, carImages]);

  // Loading state for images
  const loadingImages =
    loadingGalleries || loadingImageData || loadingCarImages;

  // Refetch function
  const refetchImages = projectId ? refetchGalleries : refetchCarImages;

  // Statistics
  const imageStats = useMemo(() => {
    const totalImages = finalImages.length;
    const galleryCount = projectId
      ? galleriesData?.galleries?.length || 0
      : carImagesData
        ? 1
        : 0;

    return {
      totalImages,
      galleryCount,
      hasImages: totalImages > 0,
      isEmpty: totalImages === 0,
      isProject: Boolean(projectId),
      isCar: Boolean(carId && !projectId),
    };
  }, [
    finalImages.length,
    projectId,
    galleriesData?.galleries?.length,
    carImagesData,
    carId,
  ]);

  return {
    // Images data
    finalImages,
    galleryImages: enrichedGalleryImages,
    carImages,

    // Loading states
    loadingImages,
    loadingGalleries,
    loadingCarImages,
    loadingImageData,

    // Actions
    refetchImages,
    refetchGalleries,
    refetchCarImages,

    // Metadata
    imageStats,
    projectId,
    carId,

    // Raw data (for debugging/advanced use)
    galleriesData,
    carImagesData,
    imageMetadata,
  };
}
