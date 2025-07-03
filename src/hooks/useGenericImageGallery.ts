import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { FilterState, ExtendedImageType, FilterOptions } from "@/types/gallery";
import { useAPI, useAPIStatus } from "@/hooks/useAPI";
import { useDebounce } from "@/hooks/useDebounce";

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
  lastModified?: number;
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
    entityId: string,
    entityType: "car" | "project",
    filters: FilterState,
    searchQuery: string,
    data: any,
    lastModified?: number
  ) => {
    try {
      const filterKey = JSON.stringify(filters);
      const cacheKey = `${CACHE_PREFIX}${entityType}_${entityId}_${btoa(filterKey)}_${btoa(searchQuery || "")}`;

      const cacheItem: ImageGalleryCacheItem = {
        data,
        timestamp: Date.now(),
        lastModified,
        filters: filterKey,
        searchQuery,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      console.log("📦 Cached gallery data:", {
        entityId,
        entityType,
        filters,
        searchQuery,
      });
    } catch (error) {
      console.warn("Failed to cache gallery data:", error);
    }
  },

  // Get cached API responses
  getCacheData: (
    entityId: string,
    entityType: "car" | "project",
    filters: FilterState,
    searchQuery: string,
    lastModified?: number
  ) => {
    try {
      const filterKey = JSON.stringify(filters);
      const cacheKey = `${CACHE_PREFIX}${entityType}_${entityId}_${btoa(filterKey)}_${btoa(searchQuery || "")}`;

      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const cacheItem: ImageGalleryCacheItem = JSON.parse(cached);
      const now = Date.now();

      // Check if cache has expired
      if (now - cacheItem.timestamp > CACHE_DURATION) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      // Check if entity has been modified since cache
      if (
        lastModified &&
        cacheItem.lastModified &&
        lastModified > cacheItem.lastModified
      ) {
        localStorage.removeItem(cacheKey);
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 Cache invalidated due to entity modification");
        return null;
      }

      console.log("💾 Using cached gallery data:", {
        entityId,
        entityType,
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

  // Clear cache for a specific entity
  clearEntityCache: (entityId: string, entityType: "car" | "project") => {
    try {
      const keys = Object.keys(localStorage);
      const entityCacheKeys = keys.filter((key) =>
        key.startsWith(`${CACHE_PREFIX}${entityType}_${entityId}_`)
      );

      entityCacheKeys.forEach((key) => localStorage.removeItem(key));
      console.log(
        `🧹 Cleared ${entityCacheKeys.length} cache entries for ${entityType} ${entityId}`
      );
    } catch (error) {
      console.warn("Failed to clear entity cache:", error);
    }
  },
};

interface UseGenericImageGalleryProps {
  entityId: string;
  entityType: "car" | "project";
  entityInfo?: any;
}

export function useGenericImageGallery({
  entityId,
  entityType,
  entityInfo,
}: UseGenericImageGalleryProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useAPI();

  // URL state management
  const isEditMode = searchParams?.get("mode") === "edit";

  // Core state
  const [images, setImages] = useState<ExtendedImageType[]>([]);
  const [filteredImages, setFilteredImages] = useState<ExtendedImageType[]>([]);
  const [currentImage, setCurrentImage] = useState<ExtendedImageType | null>(
    null
  );
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    angles: [],
    views: [],
    movements: [],
    tods: [],
    sides: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalImagesAvailable, setTotalImagesAvailable] = useState(0);
  const [serverPagination, setServerPagination] = useState<any>(null);

  // Filter and search state
  const [filters, setFilters] = useState<FilterState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // UI state
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [showImageInfo, setShowImageInfo] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Generate API endpoint based on entity type
  const getApiEndpoint = useCallback(() => {
    return entityType === "car"
      ? `/api/cars/${entityId}/images`
      : `/api/projects/${entityId}/images`;
  }, [entityId, entityType]);

  // Build query parameters
  const buildQueryParams = useCallback(
    (
      page: number,
      currentFilters: FilterState,
      search: string,
      includeCount = true
    ) => {
      const params = new URLSearchParams();

      params.set("page", page.toString());
      params.set("limit", "50");
      if (includeCount) params.set("includeCount", "true");

      // Add filters
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") {
          params.set(key, value);
        }
      });

      // Add search
      if (search && search.trim()) {
        params.set("search", search.trim());
      }

      return params.toString();
    },
    []
  );

  // Fetch images
  const fetchImages = useCallback(
    async (
      page: number = 1,
      currentFilters: FilterState = {},
      search: string = "",
      skipCache = false
    ) => {
      if (!api || !entityId) return;

      const queryString = buildQueryParams(page, currentFilters, search, true);
      const apiUrl = `${getApiEndpoint()}?${queryString}`;

      try {
        setIsLoading(true);
        setError(null);

        console.log(
          `🔍 [GENERIC IMAGE GALLERY] Fetching ${entityType} images:`,
          apiUrl
        );
        console.log(
          `🔍 [GENERIC IMAGE GALLERY] Entity ID: ${entityId}, Entity Type: ${entityType}`
        );
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🔍 [GENERIC IMAGE GALLERY] Filters:`, currentFilters);
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🔍 [GENERIC IMAGE GALLERY] Search:`, search);

        const response = await api.get(apiUrl);

        const data = response as {
          images: ExtendedImageType[];
          pagination?: any;
          filters?: any;
        };

        console.log(
          `✅ [GENERIC IMAGE GALLERY] Fetched ${data.images?.length || 0} ${entityType} images`
        );
        console.log(`✅ [GENERIC IMAGE GALLERY] Response data:`, {
          imagesCount: data.images?.length || 0,
          totalImages: data.pagination?.totalImages || 0,
          hasImages: !!(data.images && data.images.length > 0),
        });

        // Update state
        setImages(data.images || []);
        setTotalImagesAvailable(data.pagination?.totalImages || 0);
        setServerPagination(data.pagination);

        console.log(
          `✅ [GENERIC IMAGE GALLERY] State updated - images array length: ${(data.images || []).length}`
        );

        setIsLoading(false);
        setIsInitialLoad(false);
      } catch (error: any) {
        console.error(
          `❌ [GENERIC IMAGE GALLERY] Error fetching ${entityType} images:`,
          error
        );
        console.error(`❌ [GENERIC IMAGE GALLERY] Error details:`, {
          entityId,
          entityType,
          apiUrl,
          errorMessage: error.message,
          errorStack: error.stack,
        });
        setError(error);
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    },
    [api, entityId, entityType, buildQueryParams, getApiEndpoint]
  );

  // Apply filters to images
  const applyFilters = useCallback(
    (
      imageList: ExtendedImageType[],
      currentFilters: FilterState,
      search: string
    ) => {
      let filtered = [...imageList];

      // Apply metadata filters
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") {
          filtered = filtered.filter((image) => {
            const metadataValue = image.metadata?.[key];
            return metadataValue === value;
          });
        }
      });

      // Apply search filter
      if (search && search.trim()) {
        const searchLower = search.toLowerCase().trim();
        filtered = filtered.filter((image) => {
          const filename = image.filename?.toLowerCase() || "";
          const description = image.metadata?.description?.toLowerCase() || "";
          const tags = (image.metadata?.tags || []).join(" ").toLowerCase();

          return (
            filename.includes(searchLower) ||
            description.includes(searchLower) ||
            tags.includes(searchLower)
          );
        });
      }

      return filtered;
    },
    []
  );

  // Update filtered images when images or filters change
  useEffect(() => {
    const filtered = applyFilters(images, filters, debouncedSearchQuery);
    setFilteredImages(filtered);

    // Update filter options based on all images (not just filtered)
    // Map singular category names to plural property names expected by FilterOptions interface
    const categoryMap: Record<string, keyof FilterOptions> = {
      angle: "angles",
      movement: "movements",
      tod: "tods",
      view: "views",
      side: "sides",
    };

    const newFilterOptions: FilterOptions = {
      angles: [],
      views: [],
      movements: [],
      tods: [],
      sides: [],
    };

    Object.entries(categoryMap).forEach(([metadataKey, optionKey]) => {
      const values = new Set<string>();
      images.forEach((image) => {
        const value = image.metadata?.[metadataKey];
        if (value && typeof value === "string") {
          values.add(value);
        }
      });
      newFilterOptions[optionKey] = Array.from(values).sort();
    });

    setFilterOptions(newFilterOptions);

    // Update current image if it's not in filtered results
    if (currentImage && !filtered.find((img) => img._id === currentImage._id)) {
      setCurrentImage(filtered[0] || null);
    } else if (!currentImage && filtered.length > 0) {
      setCurrentImage(filtered[0]);
    }
  }, [images, filters, debouncedSearchQuery, currentImage, applyFilters]);

  // Fetch images when entity or filters change
  useEffect(() => {
    if (entityId) {
      fetchImages(1, filters, debouncedSearchQuery);
    }
  }, [entityId, filters, debouncedSearchQuery, fetchImages]);

  // Navigation functions
  const handleNext = useCallback(() => {
    if (!currentImage || filteredImages.length === 0) return;
    const currentIndex = filteredImages.findIndex(
      (img) => img._id === currentImage._id
    );
    const nextIndex = (currentIndex + 1) % filteredImages.length;
    setCurrentImage(filteredImages[nextIndex]);
  }, [currentImage, filteredImages]);

  const handlePrev = useCallback(() => {
    if (!currentImage || filteredImages.length === 0) return;
    const currentIndex = filteredImages.findIndex(
      (img) => img._id === currentImage._id
    );
    const prevIndex =
      (currentIndex - 1 + filteredImages.length) % filteredImages.length;
    setCurrentImage(filteredImages[prevIndex]);
  }, [currentImage, filteredImages]);

  const setMainImage = useCallback((image: ExtendedImageType) => {
    setCurrentImage(image);
  }, []);

  // Selection functions
  const toggleImageSelection = useCallback((imageId: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedImages(new Set(filteredImages.map((img) => img._id)));
  }, [filteredImages]);

  const handleSelectNone = useCallback(() => {
    setSelectedImages(new Set());
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedImages(new Set());
  }, []);

  // CRUD operations
  const handleUploadComplete = useCallback(() => {
    fetchImages(1, filters, debouncedSearchQuery, true);
    setIsUploadDialogOpen(false);
  }, [filters, debouncedSearchQuery, fetchImages]);

  const handleDeleteSelected = useCallback(async () => {
    if (!api || selectedImages.size === 0) return;

    try {
      setIsLoading(true);
      const imageIds = Array.from(selectedImages);

      await api.deleteWithBody(getApiEndpoint(), { imageIds });

      toast({
        title: "Images Deleted",
        description: `Successfully deleted ${imageIds.length} image(s)`,
      });

      setSelectedImages(new Set());
      fetchImages(1, filters, debouncedSearchQuery, true);
    } catch (error: any) {
      console.error("Error deleting images:", error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete images",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    api,
    selectedImages,
    getApiEndpoint,
    toast,
    filters,
    debouncedSearchQuery,
    fetchImages,
  ]);

  const handleDeleteSingle = useCallback(
    async (imageId: string) => {
      if (!api) return;

      try {
        await api.deleteWithBody(getApiEndpoint(), { imageIds: [imageId] });

        toast({
          title: "Image Deleted",
          description: "Successfully deleted image",
        });

        fetchImages(1, filters, debouncedSearchQuery, true);
      } catch (error: any) {
        console.error("Error deleting image:", error);
        toast({
          title: "Delete Failed",
          description: error.message || "Failed to delete image",
          variant: "destructive",
        });
      }
    },
    [api, getApiEndpoint, toast, filters, debouncedSearchQuery, fetchImages]
  );

  const reanalyzeImage = useCallback(async (imageId: string) => {
    // Placeholder for reanalyze functionality
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Reanalyze not implemented for projects");
  }, []);

  const handleSetPrimaryImage = useCallback(
    async (imageId: string) => {
      if (!api) return;

      try {
        const endpoint =
          entityType === "car"
            ? `/api/cars/${entityId}`
            : `/api/projects/${entityId}`;

        await api.patch(endpoint, { primaryImageId: imageId });

        toast({
          title: "Primary Image Updated",
          description: "Successfully set primary image",
        });

        fetchImages(1, filters, debouncedSearchQuery, true);
      } catch (error: any) {
        console.error("Error setting primary image:", error);
        toast({
          title: "Update Failed",
          description: error.message || "Failed to set primary image",
          variant: "destructive",
        });
      }
    },
    [
      api,
      entityType,
      entityId,
      toast,
      filters,
      debouncedSearchQuery,
      fetchImages,
    ]
  );

  const loadMoreImages = useCallback(async () => {
    // Placeholder for load more functionality
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Load more not implemented yet");
  }, []);

  return {
    // Data
    images,
    filteredImages,
    currentImage,
    filterOptions,
    isLoading,
    error,
    totalImagesAvailable,
    serverPagination,

    // State
    filters,
    searchQuery,
    selectedImages,
    currentPage,
    isModalOpen,
    isUploadDialogOpen,
    showImageInfo,
    isEditMode,
    isLoadingMore,
    isNavigating,
    isInitialLoad,

    // Actions
    setFilters,
    setSearchQuery,
    setCurrentPage,
    setMainImage,
    handleNext,
    handlePrev,
    toggleImageSelection,
    setIsModalOpen,
    setIsUploadDialogOpen,
    setShowImageInfo,
    handleUploadComplete,
    handleDeleteSelected,
    handleDeleteSingle,
    handleClearSelection,
    handleSelectAll,
    handleSelectNone,
    reanalyzeImage,
    handleSetPrimaryImage,
    loadMoreImages,
  };
}
