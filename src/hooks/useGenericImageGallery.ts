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

  // Add request cancellation and rate limiting
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestTimeRef = useRef<number>(0);
  const MIN_REQUEST_INTERVAL = 500; // Minimum 500ms between requests

  // URL state management - ensure consistent values to prevent dependency array size changes
  const isEditMode = searchParams?.get("mode") === "edit";
  const urlPage = searchParams?.get("page") || null;
  const currentImageId = searchParams?.get("image") || null;
  const selectLast = searchParams?.get("selectLast") === "true";

  // Debug URL parameters only when they change
  useEffect(() => {
    console.log("🔍 [URL PARAMS CHANGED]", {
      urlPage,
      currentImageId,
      selectLast,
      searchParamsString: searchParams?.toString(),
    });
  }, [urlPage, currentImageId, selectLast, searchParams]);

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

  // Filter and search state with stable initial reference
  const [filters, setFilters] = useState<FilterState>(() => ({}));
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Use ref to track filters to avoid circular dependencies
  const filtersRef = useRef<FilterState>({});

  // Update ref when filters change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // UI state - Initialize currentPage from URL properly
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(() => {
    // Initialize from URL page parameter, convert from 1-based to 0-based
    const pageFromUrl = urlPage ? parseInt(urlPage, 10) - 1 : 0;
    return Math.max(0, pageFromUrl); // Ensure it's not negative
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [showImageInfo, setShowImageInfo] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Simplified page synchronization - only update state from URL, never update URL from state
  useEffect(() => {
    const pageFromUrl = urlPage ? parseInt(urlPage, 10) - 1 : 0;
    const normalizedPage = Math.max(0, pageFromUrl);

    // Only update state if URL has changed, avoid circular updates
    if (normalizedPage !== currentPage && urlPage !== null) {
      console.log("🔄 [PAGE SYNC] URL changed, updating currentPage:", {
        urlPage,
        normalizedPage,
        currentPage,
      });
      setCurrentPage(normalizedPage);
    }
  }, [urlPage]); // Removed currentPage from dependencies to prevent loops

  // Cleanup function to cancel pending requests
  const cancelPendingRequests = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort("Request cancelled for new request");
        abortControllerRef.current = null;
      } catch (error) {
        console.warn("Error aborting request:", error);
      }
    }
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Give a small delay before cancelling to allow current requests to complete
      setTimeout(() => {
        cancelPendingRequests();
      }, 100);
    };
  }, [cancelPendingRequests]);

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
      params.set("limit", "15"); // Changed from 50 to 15 to match ITEMS_PER_PAGE
      if (includeCount) params.set("includeCount", "true");

      // Add filters
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (!value || value === "all" || value === "") return;

        // Map client key 'tod' to API key 'timeOfDay'
        if (key === "tod") {
          params.set("timeOfDay", value);
          return;
        }

        params.set(key, value);
      });

      // Add search
      if (search && search.trim()) {
        params.set("search", search.trim());
      }

      return params.toString();
    },
    []
  );

  // Debounced fetch function with request cancellation
  const debouncedFetchImages = useCallback(
    (
      page: number = 1,
      currentFilters: FilterState = {},
      search: string = "",
      skipCache = false,
      immediate = false
    ) => {
      const doFetch = async () => {
        if (!entityId) {
          console.log("❌ [DO FETCH] Missing entityId, cannot fetch images");
          return;
        }

        // Rate limiting check
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTimeRef.current;

        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
          console.log(
            `🚫 [RATE LIMIT] Delaying request by ${MIN_REQUEST_INTERVAL - timeSinceLastRequest}ms`
          );
          setTimeout(doFetch, MIN_REQUEST_INTERVAL - timeSinceLastRequest);
          return;
        }
        lastRequestTimeRef.current = now;

        // Only cancel if there's an active request
        if (
          abortControllerRef.current &&
          !abortControllerRef.current.signal.aborted
        ) {
          // Cancel the previous request since we're starting a new one
          cancelPendingRequests();
        }

        // Create new abort controller for this request
        let controller: AbortController;
        let signal: AbortSignal;

        try {
          controller = new AbortController();
          signal = controller.signal;
          abortControllerRef.current = controller;
        } catch (error) {
          console.warn(
            "Failed to create AbortController, proceeding without cancellation:",
            error
          );
          // Create a dummy signal that's never aborted
          signal = new AbortController().signal;
        }

        const queryString = buildQueryParams(
          page,
          currentFilters,
          search,
          true
        );
        const apiUrl = `${getApiEndpoint()}?${queryString}`;

        try {
          setIsLoading(true);
          setError(null);

          // Check if signal is already aborted before making request
          if (signal.aborted) {
            console.log(
              "🚫 [GENERIC IMAGE GALLERY] Signal already aborted, skipping request"
            );
            setIsLoading(false);
            return;
          }

          console.log(
            `🔍 [GENERIC IMAGE GALLERY] Fetching ${entityType} images:`,
            apiUrl
          );

          // Allow fetching even before auth is ready (these endpoints are public)
          const response = api
            ? await api.get(apiUrl, { skipAuth: true })
            : await fetch(apiUrl).then((r) => r.json());

          // Check if request was cancelled
          if (signal.aborted) {
            console.log("🚫 [GENERIC IMAGE GALLERY] Request was cancelled");
            setIsLoading(false);
            return;
          }

          const data = response as {
            images: ExtendedImageType[];
            pagination?: any;
            filters?: any;
          };

          console.log(
            `✅ [GENERIC IMAGE GALLERY] Fetched ${data.images?.length || 0} ${entityType} images`
          );

          // Update state
          setImages(data.images || []);
          setTotalImagesAvailable(data.pagination?.totalImages || 0);
          setServerPagination(data.pagination);

          // Let URL-based image selection handle image selection
          // This simplifies the logic and eliminates race conditions
          console.log(
            "🔍 [NAVIGATION] Images loaded, URL-based selection will handle current image"
          );

          console.log(
            "✅ [GENERIC IMAGE GALLERY] Setting isLoading: false, isInitialLoad: false"
          );
          setIsLoading(false);
          setIsInitialLoad(false);
        } catch (error: any) {
          // Don't show error if request was cancelled
          if (
            error.name === "AbortError" ||
            signal.aborted ||
            error.message?.includes("signal is aborted")
          ) {
            console.log(
              "🚫 [GENERIC IMAGE GALLERY] Request was cancelled:",
              error.message || "Unknown reason"
            );
            setIsLoading(false);
            setIsInitialLoad(false);
            return;
          }

          console.error(
            `❌ [GENERIC IMAGE GALLERY] Error fetching ${entityType} images:`,
            error
          );

          // Show user-friendly error message for rate limiting
          if (error.message?.includes("Rate limit exceeded")) {
            toast({
              title: "Loading Too Fast",
              description: "Please wait a moment before navigating again.",
              variant: "destructive",
              duration: 3000,
            });
          } else if (error.message?.includes("signal is aborted")) {
            // Don't show error for aborted signals - this is expected behavior
            console.log(
              "🚫 [GENERIC IMAGE GALLERY] Request aborted, likely due to component cleanup or new request"
            );
            setIsLoading(false);
            setIsInitialLoad(false);
            return;
          }

          setError(error);
          console.log(
            "❌ [GENERIC IMAGE GALLERY] Setting isLoading: false, isInitialLoad: false (error case)"
          );
          setIsLoading(false);
          setIsInitialLoad(false);
        }
      };

      if (immediate) {
        // For immediate requests, cancel any pending debounced requests but allow current request to complete

        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }
        doFetch();
      } else {
        // Debounce non-immediate requests

        fetchTimeoutRef.current = setTimeout(doFetch, 300);
      }
    },
    [
      api,
      entityId,
      entityType,
      buildQueryParams,
      getApiEndpoint,
      cancelPendingRequests,
      toast,
    ]
  );

  // Legacy fetchImages function for compatibility
  const fetchImages = useCallback(
    (
      page: number = 1,
      currentFilters: FilterState = {},
      search: string = "",
      skipCache = false
    ) => {
      debouncedFetchImages(page, currentFilters, search, skipCache, false);
    },
    [debouncedFetchImages]
  );

  // Apply filters to images
  const applyFilters = useCallback(
    (
      imageList: ExtendedImageType[],
      currentFilters: FilterState,
      search: string
    ) => {
      let filtered = [...imageList];

      // Handle special filters first to avoid incorrect metadata matching
      if (currentFilters.imageType && currentFilters.imageType !== "all") {
        if (currentFilters.imageType === "processed") {
          // Processed images have originalImage metadata
          filtered = filtered.filter((img) => Boolean(img.metadata?.originalImage));
        } else if (currentFilters.imageType === "with-id") {
          // Original images do not have originalImage metadata
          filtered = filtered.filter((img) => !img.metadata?.originalImage);
        }
      }

      if (currentFilters.hasImageId) {
        filtered = filtered.filter(
          (img) => Boolean(img.imageId || img.metadata?.imageId)
        );
      }

      // Apply metadata filters (exclude non-metadata keys)
      const NON_METADATA_KEYS = new Set([
        "imageType",
        "hasImageId",
        "sortBy",
        "sortDirection",
      ]);

      Object.entries(currentFilters).forEach(([key, value]) => {
        if (NON_METADATA_KEYS.has(key)) return;
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

  // Simplified image selection logic - no complex URL-based memoization
  const selectCurrentImageFromFiltered = useCallback(() => {
    console.log("🔍 [SIMPLE SELECTION]", {
      currentImageId,
      filteredImagesLength: filteredImages.length,
      firstImageId: filteredImages[0]?._id,
      lastImageId: filteredImages[filteredImages.length - 1]?._id,
    });

    // If we have no images, return null
    if (filteredImages.length === 0) {
      console.log("🔄 [SIMPLE] No images available");
      return null;
    }

    // If a specific image ID is in the URL, try to find it
    if (currentImageId) {
      const foundImage = filteredImages.find(
        (img) => img._id === currentImageId
      );
      if (foundImage) {
        console.log("🔄 [SIMPLE] Found specific image:", foundImage._id);
        return foundImage;
      }
      console.log(
        "🔄 [SIMPLE] Specific image not found in current page, falling back to first"
      );
    }

    // Default to first image
    const firstImage = filteredImages[0];
    console.log("🔄 [SIMPLE] Defaulting to first image:", firstImage._id);
    return firstImage;
  }, [filteredImages, currentImageId]);

  // Memoize filter options to prevent unnecessary re-renders
  const memoizedFilterOptions = useMemo(() => {
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

    return newFilterOptions;
  }, [images]); // Only depend on images, not filters

  // Update filtered images when images or filters change
  useEffect(() => {
    const filtered = applyFilters(images, filters, debouncedSearchQuery);
    setFilteredImages(filtered);
  }, [images, filters, debouncedSearchQuery]);

  // Update filter options only when they actually change
  useEffect(() => {
    setFilterOptions(memoizedFilterOptions);
  }, [memoizedFilterOptions]);

  // Use ref to track current image to avoid circular dependencies
  const currentImageRef = useRef<ExtendedImageType | null>(null);

  // Update ref when currentImage changes
  useEffect(() => {
    currentImageRef.current = currentImage;
  }, [currentImage]);

  // Simplified image sync effect - ONLY set state, NEVER update URL
  useEffect(() => {
    if (filteredImages.length === 0) return;

    // Priority 1: If we have a currentImageId from URL, try to find and set that image
    if (currentImageId) {
      const urlImage = filteredImages.find((img) => img._id === currentImageId);
      if (urlImage && urlImage._id !== currentImageRef.current?._id) {
        console.log("🔄 [IMAGE SYNC] Setting image from URL:", currentImageId);
        setCurrentImage(urlImage);
        return;
      }
    }

    // Priority 2: If selectLast flag is set, select the last image (but don't update URL here)
    if (selectLast && filteredImages.length > 0) {
      const lastImage = filteredImages[filteredImages.length - 1];
      if (lastImage._id !== currentImageRef.current?._id) {
        console.log("🔄 [IMAGE SYNC] Selecting last image:", lastImage._id);
        setCurrentImage(lastImage);
        return;
      }
    }

    // Priority 3: If no current image, select the first one (but don't update URL here)
    if (!currentImageRef.current && filteredImages.length > 0) {
      const firstImage = filteredImages[0];
      console.log("🔄 [IMAGE SYNC] Setting first image:", firstImage._id);
      setCurrentImage(firstImage);
    }
  }, [filteredImages, currentImageId, selectLast]);

  // Simplified atomic navigation function
  const navigateToImage = useCallback(
    (targetImageId: string, targetPage?: number) => {
      console.log("🔄 [NAVIGATE] Atomic navigation to:", {
        targetImageId,
        targetPage,
      });

      // Find and set the target image immediately
      const targetImage = filteredImages.find(
        (img) => img._id === targetImageId
      );
      if (targetImage) {
        setCurrentImage(targetImage);
      }

      // Update URL directly without triggering loops
      const params = new URLSearchParams(window.location.search);
      if (targetPage !== undefined) {
        params.set("page", (targetPage + 1).toString());
      }
      params.set("image", targetImageId);
      params.delete("selectLast");
      router.replace(`?${params.toString()}`);
    },
    [router, filteredImages]
  );

  // Simplified navigation functions
  const handleNext = useCallback(() => {
    if (!currentImage || filteredImages.length === 0) return;

    const currentIndex = filteredImages.findIndex(
      (img) => img._id === currentImage._id
    );

    console.log(
      "🔄 [NEXT] Current index:",
      currentIndex,
      "of",
      filteredImages.length
    );

    // Check if we're at the last image of the current page
    if (currentIndex === filteredImages.length - 1) {
      // Check if there's a next page available
      const totalPages =
        serverPagination?.totalPages || Math.ceil(filteredImages.length / 15);

      if (currentPage < totalPages - 1) {
        // Move to next page - URL update will trigger fetch
        const nextPage = currentPage + 1;
        console.log("🔄 [NEXT] Moving to next page:", nextPage);

        const params = new URLSearchParams(window.location.search);
        params.set("page", (nextPage + 1).toString());
        params.delete("selectLast");
        router.push(`?${params.toString()}`);
        return;
      } else {
        // No next page available, wrap to first image of current page
        const firstImage = filteredImages[0];
        navigateToImage(firstImage._id);
        return;
      }
    }

    // Navigate to next image on current page
    const nextImage = filteredImages[currentIndex + 1];
    navigateToImage(nextImage._id);
  }, [
    currentImage,
    filteredImages,
    currentPage,
    serverPagination,
    router,
    navigateToImage,
  ]);

  const handlePrev = useCallback(() => {
    if (!currentImage || filteredImages.length === 0) return;

    const currentIndex = filteredImages.findIndex(
      (img) => img._id === currentImage._id
    );

    console.log(
      "🔄 [PREV] Current index:",
      currentIndex,
      "of",
      filteredImages.length
    );

    // Check if we're at the first image of the current page
    if (currentIndex === 0) {
      // Check if there's a previous page available
      if (currentPage > 0) {
        const prevPage = currentPage - 1;
        console.log("🔄 [PREV] Moving to previous page:", prevPage);

        const params = new URLSearchParams(window.location.search);
        params.set("page", (prevPage + 1).toString());
        params.set("selectLast", "true");
        router.push(`?${params.toString()}`);
        return;
      } else {
        // No previous page available, wrap to last image of current page
        const lastImage = filteredImages[filteredImages.length - 1];
        navigateToImage(lastImage._id);
        return;
      }
    }

    // Navigate to previous image on current page
    const prevImage = filteredImages[currentIndex - 1];
    navigateToImage(prevImage._id);
  }, [currentImage, filteredImages, currentPage, router, navigateToImage]);

  // Single consolidated effect for all image fetching to eliminate race conditions
  const lastFetchParamsRef = useRef<string>("");
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    console.log("🔄 [EFFECT] Consolidated fetch effect triggered", {
      entityId,
      currentPage,
      filters,
      debouncedSearchQuery,
      isLoading,
      isInitialLoad,
      hasApi: !!api,
    });

    if (!entityId) {
      console.log("🚫 [EFFECT] Skipping fetch - missing entityId");
      return;
    }

    // Create a unique key for current fetch parameters
    const fetchKey = `${entityId}-${currentPage}-${JSON.stringify(filters)}-${debouncedSearchQuery}`;

    // Avoid duplicate fetches
    if (fetchKey === lastFetchParamsRef.current) {
      console.log("🚫 [FETCH] Skipping duplicate fetch:", fetchKey);
      // Reset loading state if we're skipping a duplicate fetch
      if (isLoading) {
        console.log(
          "🔄 [FETCH] Resetting loading state for skipped duplicate fetch"
        );
        setIsLoading(false);
        setIsInitialLoad(false);
      }
      return;
    }

    lastFetchParamsRef.current = fetchKey;

    console.log("🔄 [FETCH] Consolidated fetch:", {
      entityId,
      page: currentPage + 1,
      filters,
      search: debouncedSearchQuery,
      isInitialLoad: isInitialLoadRef.current,
    });

    // Use immediate fetch for entity/filter changes, debounced for page changes
    const isEntityOrFilterChange =
      JSON.stringify(filters) !== JSON.stringify({}) ||
      debouncedSearchQuery !== "" ||
      isInitialLoadRef.current;

    debouncedFetchImages(
      currentPage + 1,
      filters,
      debouncedSearchQuery,
      false,
      isEntityOrFilterChange // immediate for entity/filter changes
    );

    // Mark initial load as complete after first fetch
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
    }
  }, [
    entityId,
    currentPage,
    filters,
    debouncedSearchQuery,
    debouncedFetchImages,
    api,
  ]);

  // Reset initial load flag when entity changes
  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [entityId]);

  // Emergency reset: if we have images but are still loading, reset loading state
  useEffect(() => {
    if (isLoading && images.length > 0) {
      console.log(
        "🚨 [EMERGENCY] Found images but still loading, resetting state"
      );
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [isLoading, images.length]);

  // Reset loading state when API becomes available but we haven't fetched yet
  useEffect(() => {
    if (!api && isLoading) {
      console.log("🔄 [API WAIT] API not ready, keeping loading state");
    } else if (api && isLoading && images.length === 0 && isInitialLoad) {
      console.log("🚀 [API READY] API is ready, fetch should trigger soon");
    }
  }, [api, isLoading, images.length, isInitialLoad]);

  // Safety mechanism: Reset loading state if stuck for too long
  useEffect(() => {
    if (!isLoading) return;

    const timeout = setTimeout(() => {
      console.log(
        "⚠️ [SAFETY] Loading state stuck for 10 seconds, forcing reset"
      );
      setIsLoading(false);
      setIsInitialLoad(false);
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Auto-select first image when no image is specified in URL and we have images
  useEffect(() => {
    if (
      filteredImages.length > 0 &&
      !currentImageId && // No specific image in URL
      !isLoading &&
      !currentImageRef.current // No current image set
    ) {
      console.log(
        "🔄 [AUTO SELECT] No image in URL, updating URL to first image"
      );
      const params = new URLSearchParams(window.location.search);
      params.set("image", filteredImages[0]._id);
      router.replace(`?${params.toString()}`);
    }
  }, [filteredImages, currentImageId, isLoading, router]);

  const setMainImage = useCallback(
    (image: ExtendedImageType) => {
      navigateToImage(image._id);
    },
    [navigateToImage]
  );

  // Simplified page change handler
  const setCurrentPageHandler = useCallback(
    (page: number) => {
      const params = new URLSearchParams(window.location.search);
      params.set("page", (page + 1).toString());
      router.push(`?${params.toString()}`);
    },
    [router]
  );

  // Page navigation handler that preserves image position (for Shift+Arrow keys)
  const navigateToPageWithPosition = useCallback(
    (page: number) => {
      console.log(
        "🔄 [PAGE NAV] Navigating to page with position preservation:",
        {
          fromPage: currentPage,
          toPage: page,
          currentImage: currentImage?._id,
        }
      );

      const params = new URLSearchParams(window.location.search);
      params.set("page", (page + 1).toString());
      if (currentImage?._id) {
        params.set("image", currentImage._id);
      }
      router.push(`?${params.toString()}`);
    },
    [router, currentPage, currentImage]
  );

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
    fetchImages(currentPage + 1, filters, debouncedSearchQuery, true); // Convert 0-based to 1-based for API
    setIsUploadDialogOpen(false);
  }, [filters, debouncedSearchQuery, fetchImages, currentPage]); // Added currentPage dependency

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
      fetchImages(currentPage + 1, filters, debouncedSearchQuery, true); // Convert 0-based to 1-based for API
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
    currentPage, // Added currentPage dependency
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

        fetchImages(currentPage + 1, filters, debouncedSearchQuery, true); // Convert 0-based to 1-based for API
      } catch (error: any) {
        console.error("Error deleting image:", error);
        toast({
          title: "Delete Failed",
          description: error.message || "Failed to delete image",
          variant: "destructive",
        });
      }
    },
    [
      api,
      getApiEndpoint,
      toast,
      filters,
      debouncedSearchQuery,
      fetchImages,
      currentPage,
    ] // Added currentPage dependency
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

        fetchImages(currentPage + 1, filters, debouncedSearchQuery, true); // Convert 0-based to 1-based for API
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
      currentPage, // Added currentPage dependency
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
    setCurrentPage: setCurrentPageHandler,
    navigateToPageWithPosition,
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
