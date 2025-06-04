import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { FilterState, ExtendedImageType } from "@/types/gallery";
import { useFastRouter } from "@/lib/navigation/simple-cache";
import { useAPI } from "@/hooks/useAPI";
import { useDebounce } from "@/hooks/useDebounce"; // Import useDebounce for search input

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
      console.log("📦 Cached gallery data:", { carId, filters, searchQuery });
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
        console.log("🔄 Cache invalidated due to car modification");
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
        console.log(`🧹 Cleared ${clearedCount} expired cache entries`);
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

export function useImageGallery(carId: string, vehicleInfo?: any) {
  const router = useRouter();
  const { fastReplace } = useFastRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const lastNavigationRef = useRef<number>(0);
  const api = useAPI();

  // URL-based state
  const isEditMode = searchParams?.get("mode") === "edit";
  const urlPage = searchParams?.get("page");
  const currentImageId = searchParams?.get("image");
  const urlSearchQuery = searchParams?.get("search") || ""; // Initialize search from URL

  // Enhanced caching state
  const [cachedData, setCachedData] = useState<any>(null);
  const carLastModified = useMemo(
    () =>
      vehicleInfo?.updatedAt
        ? new Date(vehicleInfo.updatedAt).getTime()
        : undefined,
    [vehicleInfo?.updatedAt]
  );

  // Local state for pagination and incremental loading
  const [currentLimit, setCurrentLimit] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalImagesAvailable, setTotalImagesAvailable] = useState<
    number | undefined
  >(undefined);
  const [additionalImages, setAdditionalImages] = useState<ExtendedImageType[]>(
    []
  );
  const loadMoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Local state
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState<FilterState>({});
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery); // Initialize from URL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [showImageInfo, setShowImageInfo] = useState(false);
  const [selectedUrlOption, setSelectedUrlOption] =
    useState<string>("Original");
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  // Debounce search query to prevent excessive API calls and page refreshes
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const itemsPerPage = 15;

  // Cache cleanup on mount
  useEffect(() => {
    cacheUtils.clearExpiredCache();
  }, []);

  // Check for cached data before making API call
  useEffect(() => {
    // Temporarily disable caching to prevent issues
    // const cached = cacheUtils.getCacheData(carId, filters, debouncedSearchQuery, carLastModified);
    // if (cached) {
    //   setCachedData(cached);
    // } else {
    //   setCachedData(null);
    // }
    setCachedData(null);
  }, [carId, filters, debouncedSearchQuery, carLastModified]); // Use debouncedSearchQuery

  // Extract image type arrays from vehicle info for filtering
  const originalImageIds = useMemo(() => {
    const ids = new Set(vehicleInfo?.imageIds || []);
    return ids;
  }, [vehicleInfo?.imageIds]);

  const processedImageIds = useMemo(() => {
    const ids = new Set(vehicleInfo?.processedImageIds || []);
    return ids;
  }, [vehicleInfo?.processedImageIds]);

  // Build API query parameters from current filters and search
  const buildApiQuery = useCallback(
    (limit: number, skip = 0) => {
      const params = new URLSearchParams({
        limit: limit.toString(),
      });

      if (skip > 0) {
        params.append("skip", skip.toString());
      }

      // Add filter parameters - ALL now supported server-side
      if (filters.angle) params.append("angle", filters.angle);
      if (filters.movement) params.append("movement", filters.movement);
      if (filters.view) params.append("view", filters.view);
      if (filters.tod) params.append("timeOfDay", filters.tod);
      if (filters.side) params.append("side", filters.side);
      if (filters.imageType) params.append("imageType", filters.imageType);

      // Add search query - use debounced version to prevent excessive API calls
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);

      return params.toString();
    },
    [filters, debouncedSearchQuery]
  );

  // API Query for initial data fetching with enhanced caching
  const apiLimit = 50;
  const apiQueryString = buildApiQuery(apiLimit);
  const {
    data,
    error,
    isLoading,
    refetch: mutate,
  } = useAPIQuery<{
    images: ExtendedImageType[];
    pagination?: {
      totalImages?: number;
      totalPages?: number;
      currentPage?: number;
    };
  }>(`/api/cars/${carId}/images?${apiQueryString}`, {
    staleTime: 60 * 1000, // 1 minute
    // Disable cached data for now to prevent issues
    // initialData: cachedData,
  });

  // Sync debounced search query to URL to enable sharing and prevent page refresh
  useEffect(() => {
    if (searchParams && debouncedSearchQuery !== urlSearchQuery) {
      const params = new URLSearchParams(searchParams.toString());

      if (debouncedSearchQuery.trim()) {
        params.set("search", debouncedSearchQuery);
      } else {
        params.delete("search");
      }

      // Reset to page 1 when search changes
      params.set("page", "1");

      // Use router.replace to update URL without adding to history
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [debouncedSearchQuery, urlSearchQuery, searchParams, router]);

  // Cache successful API responses when data changes (disabled for now)
  useEffect(() => {
    // Temporarily disable caching to prevent issues
    // if (data) {
    //   cacheUtils.setCacheData(carId, filters, debouncedSearchQuery, data, carLastModified);
    //
    //   // Cache image metadata for faster access
    //   data.images?.forEach((image: ExtendedImageType) => {
    //     if (image.metadata) {
    //       cacheUtils.setImageMetadata(image.id || image._id, image.metadata);
    //     }
    //   });
    // }
  }, [data, carId, filters, debouncedSearchQuery, carLastModified]); // Use debouncedSearchQuery

  // Enhanced image data with cached metadata (simplified for now)
  const enhancedImages = useMemo(() => {
    const baseImages = data?.images || [];

    // Temporarily disable metadata enhancement to prevent issues
    return baseImages;

    // return baseImages.map((image: ExtendedImageType) => {
    //   const imageId = image.id || image._id;
    //   const cachedMetadata = cacheUtils.getImageMetadata(imageId);
    //
    //   if (cachedMetadata && !image.metadata) {
    //     return {
    //       ...image,
    //       metadata: cachedMetadata,
    //     };
    //   }
    //
    //   return image;
    // });
  }, [data?.images]);

  // Combine initial images with incrementally loaded images
  const images = useMemo(() => {
    const initialImages = enhancedImages;
    const allImages = [...initialImages, ...additionalImages];

    // Deduplicate by ID
    const seenIds = new Set<string>();
    const deduplicated = allImages.filter((image) => {
      const imageId = image.id || image._id;
      if (seenIds.has(imageId)) {
        return false;
      }
      seenIds.add(imageId);
      return true;
    });

    return deduplicated;
  }, [enhancedImages, additionalImages]);

  // Helper function for search query matching
  const matchesSearchQuery = useCallback(
    (image: ExtendedImageType, query: string) => {
      const lowerQuery = query.toLowerCase();
      return (
        image.metadata?.description?.toLowerCase().includes(lowerQuery) ||
        image.filename?.toLowerCase().includes(lowerQuery) ||
        image.metadata?.angle?.toLowerCase().includes(lowerQuery) ||
        image.metadata?.view?.toLowerCase().includes(lowerQuery) ||
        (image.id || image._id)?.toLowerCase().includes(lowerQuery)
      );
    },
    []
  );

  // Memoized filter options
  const filterOptions = useMemo(() => {
    if (!images || images.length === 0) {
      return {
        angles: [],
        views: [],
        movements: [],
        tods: [],
        sides: [],
      };
    }

    // Extract all unique metadata values
    const angles = new Set<string>();
    const views = new Set<string>();
    const movements = new Set<string>();
    const tods = new Set<string>();
    const sides = new Set<string>();

    images.forEach((image: ExtendedImageType) => {
      // Check direct metadata
      if (image.metadata?.angle) angles.add(image.metadata.angle);
      if (image.metadata?.view) views.add(image.metadata.view);
      if (image.metadata?.movement) movements.add(image.metadata.movement);
      if (image.metadata?.tod) tods.add(image.metadata.tod);
      if (image.metadata?.side) sides.add(image.metadata.side);

      // Check nested metadata for processed images
      const originalMetadata = image.metadata?.originalImage?.metadata;
      if (originalMetadata) {
        if (originalMetadata.angle) angles.add(originalMetadata.angle);
        if (originalMetadata.view) views.add(originalMetadata.view);
        if (originalMetadata.movement) movements.add(originalMetadata.movement);
        if (originalMetadata.tod) tods.add(originalMetadata.tod);
        if (originalMetadata.side) sides.add(originalMetadata.side);
      }

      // Map category to view for processed images
      if (image.metadata?.category) {
        views.add(image.metadata.category);
      }
    });

    return {
      angles: Array.from(angles).sort(),
      views: Array.from(views).sort(),
      movements: Array.from(movements).sort(),
      tods: Array.from(tods).sort(),
      sides: Array.from(sides).sort(),
    };
  }, [images]);

  // Memoized filtered images
  const filteredImages = useMemo(() => {
    const filtered = images.filter((image: ExtendedImageType) => {
      const imageId = image.id || image._id;

      // Check if any filters are active
      if (Object.keys(filters).length === 0 && !debouncedSearchQuery) {
        return true;
      }

      // Apply search query filter first - use debounced version
      if (
        debouncedSearchQuery &&
        !matchesSearchQuery(image, debouncedSearchQuery)
      ) {
        return false;
      }

      // Apply each filter
      for (const [key, value] of Object.entries(filters)) {
        if (!value) continue; // Skip empty filters

        // Handle server-side metadata filters (ALL are now processed on the backend)
        // Skip client-side filtering for these as they're already filtered by API
        if (
          ["angle", "view", "movement", "tod", "side", "imageType"].includes(
            key
          )
        ) {
          continue; // These are ALL handled server-side now
        }

        // Apply any remaining client-side filters here if needed
      }

      return true;
    });

    // Remove duplicates based on image ID
    const deduplicated = filtered.reduce((acc, current) => {
      const id = current.id || current._id;
      if (!acc.find((item) => (item.id || item._id) === id)) {
        acc.push(current);
      }
      return acc;
    }, [] as ExtendedImageType[]);

    return deduplicated;
  }, [
    images,
    filters,
    debouncedSearchQuery,
    originalImageIds,
    processedImageIds,
    matchesSearchQuery,
  ]);

  // Current image based on URL
  const currentImage = useMemo(() => {
    const currentImageId = searchParams?.get("image") || null;

    if (!currentImageId || filteredImages.length === 0) {
      return filteredImages[0] || null;
    }

    const found = filteredImages.find(
      (img) => (img.id || img._id) === currentImageId
    );

    return found || filteredImages[0] || null;
  }, [filteredImages, searchParams]);

  // Local state for current image index (direct approach)
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Sync currentImageIndex with URL when URL changes
  useEffect(() => {
    if (currentImageId && filteredImages.length > 0) {
      const index = filteredImages.findIndex(
        (img: ExtendedImageType) =>
          img.id === currentImageId || img._id === currentImageId
      );
      if (index >= 0) {
        setCurrentImageIndex(index);
      }
    }
  }, [currentImageId, filteredImages]);

  // Memoized paginated images
  const paginatedImages = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    return filteredImages.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredImages, currentPage, itemsPerPage]);

  // Calculate pagination based on server data when available, fallback to client-side
  const serverPagination = useMemo(() => {
    // Check if we have client-side-only filters that the server doesn't handle
    const hasClientSideOnlyFilters = Boolean(
      filters.hasImageId // Only hasImageId is client-side only now - imageType is server-side
    );

    // Use server pagination only if server is doing the filtering
    if (
      data?.pagination?.totalImages !== undefined &&
      !hasClientSideOnlyFilters
    ) {
      // Use server pagination data for server-side filtered results
      return {
        totalImages: data.pagination.totalImages,
        totalPages: Math.ceil(data.pagination.totalImages / itemsPerPage),
        currentPage: currentPage + 1, // Convert to 1-based for display
        itemsPerPage,
        startIndex: currentPage * itemsPerPage + 1,
        endIndex: Math.min(
          (currentPage + 1) * itemsPerPage,
          data.pagination.totalImages
        ),
        isServerPagination: true,
      };
    } else {
      // Use client-side pagination for client-filtered results
      const clientTotalImages = filteredImages.length;
      console.log("📊 Using client-side pagination:", {
        hasClientSideOnlyFilters,
        clientTotalImages,
        activeFilters: filters,
        imagesLoaded: images.length,
        note: "imageType is now server-side",
      });

      return {
        totalImages: clientTotalImages,
        totalPages: Math.ceil(clientTotalImages / itemsPerPage),
        currentPage: currentPage + 1, // Convert to 1-based for display
        itemsPerPage,
        startIndex: currentPage * itemsPerPage + 1,
        endIndex: Math.min((currentPage + 1) * itemsPerPage, clientTotalImages),
        isServerPagination: false,
      };
    }
  }, [
    data?.pagination?.totalImages,
    filters,
    filteredImages.length,
    currentPage,
    itemsPerPage,
    images.length,
  ]);

  const totalPages = serverPagination.totalPages;

  // Handlers
  const handlePageChange = useCallback(
    (newPage: number) => {
      try {
        console.log("Manual page change to:", newPage + 1);
        setIsNavigating(true); // Block early loading during manual navigation
        setCurrentPage(newPage);
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.set("page", (newPage + 1).toString());
        router.replace(`?${params.toString()}`, { scroll: false });

        // Reset navigation flag after a brief delay
        setTimeout(() => setIsNavigating(false), 500);
      } catch (error) {
        console.error("Error changing page:", error);
        // Fallback: just update local state
        setCurrentPage(newPage);
        setIsNavigating(false);
      }
    },
    [searchParams, router]
  );

  const setMainImage = useCallback(
    (imageId: string) => {
      try {
        console.log("setMainImage called with:", imageId);

        const imageIndex = filteredImages.findIndex(
          (img: ExtendedImageType) => img.id === imageId || img._id === imageId
        );
        console.log("Found image at index:", imageIndex);
        if (imageIndex >= 0) {
          const targetPage = Math.floor(imageIndex / itemsPerPage);

          // Update local state immediately for instant UI feedback
          setCurrentPage(targetPage);

          // Batch URL updates to reduce navigation calls
          const params = new URLSearchParams(searchParams?.toString() || "");
          const currentImage = params.get("image");
          const currentPageParam = params.get("page");
          const newPageParam = (targetPage + 1).toString();

          // Only update URL if values actually changed
          if (currentImage !== imageId || currentPageParam !== newPageParam) {
            params.set("image", imageId);
            params.set("page", newPageParam);

            // Use ultra-fast router for instant navigation
            const newUrl = `?${params.toString()}`;
            console.log("Updating URL to:", newUrl);
            fastReplace(newUrl, { scroll: false });
          } else {
            console.log("URL already has correct values, skipping update");
          }
        }
      } catch (error) {
        console.error("Error setting main image:", error);
        // Fallback: just update local state without URL navigation
        const imageIndex = filteredImages.findIndex(
          (img: ExtendedImageType) => img.id === imageId || img._id === imageId
        );
        if (imageIndex >= 0) {
          const targetPage = Math.floor(imageIndex / itemsPerPage);
          setCurrentPage(targetPage);
        }
      }
    },
    [filteredImages, itemsPerPage, searchParams, fastReplace]
  );

  const handleNext = useCallback(() => {
    try {
      console.log("=== HANDLE NEXT START ===");

      // Get the current actual index in the array
      const currentActualIndex = filteredImages.findIndex(
        (img: ExtendedImageType) => {
          const matches =
            img.id === (currentImage?.id || currentImage?._id) ||
            img._id === (currentImage?.id || currentImage?._id);
          return matches;
        }
      );

      console.log("Current state:", {
        currentActualIndex,
        filteredImagesLength: filteredImages.length,
        currentImageId: currentImage?.id || currentImage?._id,
      });

      // Calculate next index directly
      const nextIndex = (currentActualIndex + 1) % filteredImages.length;
      const nextImage = filteredImages[nextIndex];

      console.log("Navigation calculation:", {
        currentActualIndex,
        nextIndex,
        nextImageId: nextImage?.id || nextImage?._id,
        calculation: `(${currentActualIndex} + 1) % ${filteredImages.length} = ${nextIndex}`,
      });

      if (nextImage) {
        // Use setMainImage which handles pagination automatically
        setMainImage(nextImage.id || nextImage._id);
      }
      console.log("=== HANDLE NEXT END ===");
    } catch (error) {
      console.error("Error navigating to next image:", error);
    }
  }, [filteredImages, currentImage, setMainImage]);

  const handlePrev = useCallback(() => {
    try {
      console.log("=== HANDLE PREV START ===");

      // Get the current actual index in the array
      const currentActualIndex = filteredImages.findIndex(
        (img: ExtendedImageType) => {
          const matches =
            img.id === (currentImage?.id || currentImage?._id) ||
            img._id === (currentImage?.id || currentImage?._id);
          return matches;
        }
      );

      console.log("Current state:", {
        currentActualIndex,
        filteredImagesLength: filteredImages.length,
        currentImageId: currentImage?.id || currentImage?._id,
      });

      // Calculate prev index directly
      const prevIndex =
        (currentActualIndex - 1 + filteredImages.length) %
        filteredImages.length;
      const prevImage = filteredImages[prevIndex];

      console.log("Navigation calculation:", {
        currentActualIndex,
        prevIndex,
        prevImageId: prevImage?.id || prevImage?._id,
        calculation: `(${currentActualIndex} - 1 + ${filteredImages.length}) % ${filteredImages.length} = ${prevIndex}`,
      });

      if (prevImage) {
        // Use setMainImage which handles pagination automatically
        setMainImage(prevImage.id || prevImage._id);
      }
      console.log("=== HANDLE PREV END ===");
    } catch (error) {
      console.error("Error navigating to previous image:", error);
    }
  }, [filteredImages, currentImage, setMainImage]);

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

  // Optimized load more images function with better performance
  const loadMoreImages = useCallback(async () => {
    // Clear any existing timeout
    if (loadMoreTimeoutRef.current) {
      clearTimeout(loadMoreTimeoutRef.current);
    }

    // Debounce the actual loading with shorter delay for better UX
    loadMoreTimeoutRef.current = setTimeout(async () => {
      if (
        isLoadingMore ||
        isNavigating || // Don't load during manual navigation
        !totalImagesAvailable ||
        images.length >= totalImagesAvailable ||
        !api
      ) {
        return;
      }

      setIsLoadingMore(true);
      try {
        // PERFORMANCE OPTIMIZATION: Load fewer images per batch but more frequently
        // This reduces the memory footprint and improves response time
        const batchSize = 25; // Reduced from 50 to 25 for faster loading
        const newLimit = images.length + batchSize;

        // Use skip parameter instead of relying on client-side deduplication
        const skip = images.length;
        const apiQueryString = buildApiQuery(batchSize, skip);

        const additionalData = await api.get<{
          images: ExtendedImageType[];
          pagination?: {
            totalImages?: number;
            totalPages?: number;
            currentPage?: number;
          };
        }>(`/api/cars/${carId}/images?${apiQueryString}`);

        if (additionalData?.images && additionalData.images.length > 0) {
          // PERFORMANCE FIX: Use functional update to avoid stale closures
          setAdditionalImages((prev) => {
            // Deduplicate by ID to prevent duplicates from race conditions
            const existingIds = new Set([
              ...(data?.images || []).map((img) => img.id || img._id),
              ...prev.map((img) => img.id || img._id),
            ]);

            const newImages = additionalData.images.filter(
              (img) => !existingIds.has(img.id || img._id)
            );

            return [...prev, ...newImages];
          });

          setCurrentLimit(newLimit);

          // Update total available count if provided
          if (additionalData.pagination?.totalImages !== undefined) {
            setTotalImagesAvailable(additionalData.pagination.totalImages);
          }
        }
      } catch (error) {
        console.error("Error loading more images:", error);
        // Don't spam the user with error messages for background loading
      } finally {
        setIsLoadingMore(false);
      }
    }, 150); // Reduced debounce time from 300ms to 150ms for more responsive loading
  }, [
    buildApiQuery,
    isLoadingMore,
    isNavigating,
    totalImagesAvailable,
    images.length,
    currentLimit,
    api,
    carId,
    data?.images, // Add data.images to dependency for better deduplication
  ]);

  const handleUploadComplete = useCallback(async () => {
    try {
      // Reset additional images since we're doing a full refresh after upload
      setAdditionalImages([]);
      await mutate();
      setIsUploadDialogOpen(false);
      toast({
        title: "Success",
        description: "Images uploaded successfully",
      });
    } catch (error) {
      console.error("Error after upload:", error);
      toast({
        title: "Error",
        description: "Failed to refresh images after upload",
        variant: "destructive",
      });
    }
  }, [mutate, toast]);

  const handleDeleteSelected = useCallback(
    async (deleteFromStorage = true) => {
      if (selectedImages.size === 0 || !api) return;

      try {
        const imageIds = Array.from(selectedImages);
        await api.deleteWithBody(`cars/${carId}/images`, {
          imageIds,
          deleteFromStorage,
        });

        toast({
          title: "Success",
          description: `${imageIds.length} image(s) deleted successfully`,
        });
        setSelectedImages(new Set());
        // Reset additional images since we're doing a full refresh after deletion
        setAdditionalImages([]);
        await mutate();
      } catch (error) {
        console.error("Error deleting images:", error);
        toast({
          title: "Error",
          description: "Failed to delete images",
          variant: "destructive",
        });
      }
    },
    [selectedImages, carId, toast, mutate, api]
  );

  const handleDeleteSingle = useCallback(
    async (imageId: string, deleteFromStorage = true) => {
      if (!api) return;

      try {
        await api.deleteWithBody(`cars/${carId}/images`, {
          imageIds: [imageId],
          deleteFromStorage,
        });

        toast({
          title: "Success",
          description: "Image deleted successfully",
        });

        // Clear the selection if the deleted image was selected
        setSelectedImages((prev) => {
          const newSelection = new Set(prev);
          newSelection.delete(imageId);
          return newSelection;
        });

        // If the deleted image was the current image, switch to another image
        if (currentImageId === imageId && images.length > 1) {
          const currentIndex = images.findIndex(
            (img) => (img.id || img._id) === imageId
          );
          let newImageIndex = 0;

          if (currentIndex >= 0) {
            // Try to select the next image, or previous if it was the last
            newImageIndex =
              currentIndex < images.length - 1
                ? currentIndex
                : currentIndex - 1;
          }

          const newImage = images[newImageIndex];
          if (newImage && (newImage.id || newImage._id) !== imageId) {
            const params = new URLSearchParams(searchParams?.toString() || "");
            params.set("image", newImage.id || newImage._id);
            router.replace(`?${params.toString()}`, { scroll: false });
          }
        }

        // Reset additional images since we're doing a full refresh after deletion
        setAdditionalImages([]);
        await mutate();
      } catch (error) {
        console.error("Error deleting image:", error);
        toast({
          title: "Error",
          description: "Failed to delete image",
          variant: "destructive",
        });
        throw error; // Re-throw so the UI can handle the error state
      }
    },
    [carId, toast, mutate, api, currentImageId, images, searchParams, router]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedImages(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    const allImageIds = new Set(
      filteredImages.map((image) => image.id || image._id)
    );
    setSelectedImages(allImageIds);
  }, [filteredImages]);

  const handleSelectNone = useCallback(() => {
    setSelectedImages(new Set());
  }, []);

  const reanalyzeImage = useCallback(
    async (imageId: string, promptId?: string, modelId?: string) => {
      if (isReanalyzing || !api) return;

      setIsReanalyzing(true);
      try {
        const promptText = promptId ? " with custom prompt" : "";
        const modelText = modelId ? ` using ${modelId}` : "";

        toast({
          title: "Re-analyzing Image",
          description: `Using enhanced validation${promptText}${modelText} to improve metadata accuracy...`,
        });

        const requestBody: any = {
          imageId,
          carId,
        };

        if (promptId) {
          requestBody.promptId = promptId;
        }
        if (modelId) {
          requestBody.modelId = modelId;
        }

        const result = await api.post("openai/reanalyze-image", requestBody);

        toast({
          title: "Re-analysis Complete",
          description: "Image metadata has been updated with improved accuracy",
        });

        await mutate();
      } catch (error) {
        console.error("Re-analysis error:", error);
        toast({
          title: "Re-analysis Failed",
          description:
            error instanceof Error
              ? error.message
              : "Failed to re-analyze image",
          variant: "destructive",
        });
      } finally {
        setIsReanalyzing(false);
      }
    },
    [isReanalyzing, carId, toast, mutate, api]
  );

  const handleSetPrimaryImage = useCallback(
    async (imageId: string) => {
      if (!api) return;

      try {
        await api.patch(`cars/${carId}/thumbnail`, {
          primaryImageId: imageId,
        });

        toast({
          title: "Success",
          description: "Primary image updated successfully",
        });

        await mutate();
      } catch (error) {
        console.error("Error setting primary image:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to update primary image",
          variant: "destructive",
        });
        throw error; // Re-throw so the UI can handle the error state
      }
    },
    [carId, toast, mutate, api]
  );

  // Initialize currentImageId if not present in URL
  useEffect(() => {
    if (!currentImageId && filteredImages.length > 0 && searchParams) {
      const firstImage = filteredImages[0];
      if (firstImage) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("image", firstImage.id || firstImage._id);
        if (!params.get("page")) {
          params.set("page", "1");
        }
        const newUrl = `?${params.toString()}`;
        // Initialize with the first image when none is selected
        fastReplace(newUrl, { scroll: false });
      }
    }
  }, [currentImageId, filteredImages, searchParams, fastReplace]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, []);

  // Reset pagination and adjust current image when filters change
  useEffect(() => {
    // Only reset if we have filtered results and we're not on page 1
    if (filteredImages.length > 0 && currentPage > 0) {
      setCurrentPage(0);

      // Update URL to reflect page reset
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("page", "1");

      // If current image is not in filtered results, select first filtered image
      const currentImageStillVisible = filteredImages.some(
        (img) => (img.id || img._id) === currentImageId
      );

      if (!currentImageStillVisible) {
        const firstFilteredImage = filteredImages[0];
        params.set("image", firstFilteredImage.id || firstFilteredImage._id);
      }

      // Use router replace to update URL without adding to history
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [filters, debouncedSearchQuery, filteredImages.length]); // Use debouncedSearchQuery to prevent reset on every keystroke

  // Separate effect to handle when currentPage exceeds available pages
  useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil(filteredImages.length / itemsPerPage) - 1
    );

    if (currentPage > maxPage && filteredImages.length > 0) {
      setCurrentPage(maxPage);

      // Update URL
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("page", (maxPage + 1).toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [filteredImages.length, currentPage, itemsPerPage, router, searchParams]);

  // Update total count when data changes - using the correct API response structure
  useEffect(() => {
    if (data?.pagination?.totalImages !== undefined) {
      setTotalImagesAvailable(data.pagination.totalImages);
    } else if (images.length > 0) {
      // Fallback: if we loaded fewer images than requested, we're probably at the end
      const isLikelyComplete = images.length < currentLimit;
      const fallbackTotal = isLikelyComplete ? images.length : undefined;
      setTotalImagesAvailable(fallbackTotal);
    }

    // FIXED: Mark initial load as complete when we have ANY response from API (including empty responses)
    // This prevents infinite loading when there are no images
    if ((data !== undefined || error) && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [
    data?.pagination?.totalImages,
    images.length,
    currentLimit,
    data,
    error,
    isInitialLoad,
  ]);

  // Reset additional images when filters or search change to refetch from server
  useEffect(() => {
    // Clear additional images to force fresh API call with new filters
    setAdditionalImages([]);
    setTotalImagesAvailable(undefined);
  }, [filters, debouncedSearchQuery]); // Use debouncedSearchQuery to prevent excessive API calls

  // Handle pagination when filteredImages count changes
  useEffect(() => {
    if (totalPages > 0 && currentPage >= totalPages) {
      setCurrentPage(totalPages - 1);
    }
  }, [filteredImages.length, currentPage, totalPages]);

  return {
    // Data
    images,
    filteredImages,
    paginatedImages,
    currentImage,
    filterOptions,
    isLoading,
    error,
    totalPages,
    mainIndex: currentImageIndex,
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
    selectedUrlOption,
    isReanalyzing,
    isEditMode,
    isLoadingMore,
    isNavigating,
    isInitialLoad,

    // Actions
    setFilters,
    setSearchQuery,
    setSelectedImages,
    setCurrentPage: handlePageChange,
    setMainImage,
    handleNext,
    handlePrev,
    toggleImageSelection,
    setIsModalOpen,
    setIsUploadDialogOpen,
    setShowImageInfo,
    setSelectedUrlOption,
    handleUploadComplete,
    handleDeleteSelected,
    handleDeleteSingle,
    handleClearSelection,
    handleSelectAll,
    handleSelectNone,
    reanalyzeImage,
    handleSetPrimaryImage,
    loadMoreImages,
    mutate,
  };
}
