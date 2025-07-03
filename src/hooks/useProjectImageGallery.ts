import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { FilterState, ExtendedImageType } from "@/types/gallery";
import { useAPI, useAPIStatus } from "@/hooks/useAPI";
import { useDebounce } from "@/hooks/useDebounce";

// Helper function to normalize image URLs to medium variant
const getMediumVariantUrl = (baseUrl: string): string => {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 [PROJECT GALLERY] URL normalization input:", baseUrl);

  if (!baseUrl || !baseUrl.includes("imagedelivery.net")) {
    console.log(
      "✅ [PROJECT GALLERY] Non-Cloudflare URL, returning as-is:",
      baseUrl
    );
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
  console.log("🔄 [PROJECT GALLERY] URL normalization result:", {
    original: baseUrl,
    normalized: normalizedUrl,
    wasNormalized: baseUrl !== normalizedUrl,
  });

  return normalizedUrl;
};

export function useProjectImageGallery(projectId: string, projectInfo?: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const api = useAPI();

  console.log("🚀 [PROJECT GALLERY] Hook initialized:", {
    projectId,
    projectInfo: !!projectInfo,
    hasApi: !!api,
  });

  // URL-based state
  const isEditMode = searchParams?.get("mode") === "edit";
  const urlPage = searchParams?.get("page");
  const currentImageId = searchParams?.get("image");
  const urlSearchQuery = searchParams?.get("search") || "";
  const selectLast = searchParams?.get("selectLast") === "true";

  // Local state for pagination and incremental loading
  const [currentLimit, setCurrentLimit] = useState(200); // API maximum is 200
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [totalImagesAvailable, setTotalImagesAvailable] = useState<
    number | undefined
  >(undefined);

  // Local state - Initialize currentPage from URL properly
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(() => {
    // Initialize from URL page parameter, convert from 1-based to 0-based
    const pageFromUrl = urlPage ? parseInt(urlPage, 10) - 1 : 0;
    return Math.max(0, pageFromUrl); // Ensure it's not negative
  });
  const [filters, setFilters] = useState<FilterState>({
    sortBy: "updatedAt",
    sortDirection: "desc",
  });
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery); // Initialize from URL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [showImageInfo, setShowImageInfo] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isDeletingImages, setIsDeletingImages] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetImages, setDeleteTargetImages] = useState<string[]>([]);

  // Debounce search query to prevent excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const itemsPerPage = 15;

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

      // Add sorting parameters - always send to ensure consistent ordering
      if (filters.sortBy) {
        params.append("sort", filters.sortBy);
        if (filters.sortDirection)
          params.append("sortDirection", filters.sortDirection);
      }

      // Add search query - use debounced version to prevent excessive API calls
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);

      const queryString = params.toString();
      console.log("🔧 [PROJECT GALLERY] buildApiQuery called:", {
        projectId,
        limit,
        skip,
        filters: Object.keys(filters).length > 0 ? filters : "none",
        searchQuery: debouncedSearchQuery || "none",
        result: queryString,
      });

      return queryString;
    },
    [projectId, filters, debouncedSearchQuery]
  );

  // API Query with server-side pagination
  const apiSkip = currentPage * itemsPerPage;
  const apiLimit = itemsPerPage; // Request only what we need for current page
  const apiQueryString = buildApiQuery(apiLimit, apiSkip);

  // Add includeCount=true to ensure we get pagination info from API
  const enhancedQueryString = apiQueryString
    ? `${apiQueryString}&includeCount=true`
    : `limit=${apiLimit}&skip=${apiSkip}&includeCount=true`;

  const apiEndpoint = `/api/projects/${projectId}/images?${enhancedQueryString}`;

  console.log(
    "🔄 [PROJECT GALLERY] useAPIQuery hook with endpoint:",
    apiEndpoint
  );

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
  }>(apiEndpoint, {
    staleTime: 30 * 1000, // Restored to 30 seconds since we reload page after uploads
    enabled: !!projectId && !!api, // Only run when we have a valid projectId AND api client
    refetchOnWindowFocus: true, // Allow refetch on window focus to catch updates
    refetchOnReconnect: true, // Allow refetch on reconnect
    retry: 1, // Allow one retry for network issues
    refetchInterval: false, // Don't auto-refetch on interval
  });

  console.log("📊 [PROJECT GALLERY] API Query result:", {
    projectId,
    apiEndpoint,
    isLoading,
    error: error?.message,
    imagesCount: data?.images?.length || 0,
    totalImages: data?.pagination?.totalImages || 0,
    hasData: !!data,
    hasImages: !!(data?.images && data.images.length > 0),
  });

  // Simplified debug logging
  if (data?.images && data.images.length > 0) {
    console.log(
      `🎯 [PROJECT GALLERY] ${data.images.length} images loaded successfully`
    );
  } else if (data && !isLoading) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ [PROJECT GALLERY] No images in API response");
  }

  // Better error handling for authentication issues
  const { isAuthenticated, isLoading: authLoading } = useAPIStatus();

  useEffect(() => {
    if (error?.message === "Authentication required") {
      console.log(
        "🔐 [PROJECT GALLERY] Authentication required - checking auth status...",
        {
          isAuthenticated,
          authLoading,
          hasApi: !!api,
        }
      );

      const timeoutId = setTimeout(() => {
        if (!authLoading && !isAuthenticated) {
          toast({
            title: "Sign In Required",
            description: "Please sign in to view project images",
            variant: "destructive",
          });
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
    // No cleanup needed for other cases
    return undefined;
  }, [error, isAuthenticated, authLoading, api, toast]);

  // Use server response directly (no additional images for pure server-side pagination)
  const allImages = useMemo(() => {
    const images = data?.images || [];
    console.log("🔄 [PROJECT GALLERY] Server-side pagination images:", {
      imagesCount: images.length,
      currentPage: currentPage + 1,
      skip: currentPage * itemsPerPage,
      limit: itemsPerPage,
    });
    return images;
  }, [data?.images, currentPage, itemsPerPage]);

  // Server handles filtering, we just use the response directly
  const filteredImages = useMemo(() => {
    // Server already handles filtering, just return the images
    console.log("🔄 [PROJECT GALLERY] Using server-filtered images:", {
      imagesCount: allImages.length,
      currentPage: currentPage + 1,
    });

    return allImages;
  }, [allImages, currentPage]);

  // Update pagination info
  useEffect(() => {
    if (data?.pagination?.totalImages !== undefined) {
      setTotalImagesAvailable(data.pagination.totalImages);
      console.log(
        "📊 [PROJECT GALLERY] Updated total images available:",
        data.pagination.totalImages
      );
    }
  }, [data?.pagination?.totalImages]);

  // Keep a stable reference to current image to avoid flicker during page transitions
  const [stableCurrentImage, setStableCurrentImage] =
    useState<ExtendedImageType | null>(null);

  // Initialize current image from URL parameter or first/last filtered image
  const currentImage = useMemo(() => {
    if (currentImageId) {
      const foundImage = filteredImages.find(
        (img) => img._id === currentImageId
      );
      if (foundImage) return foundImage;
    }

    // If selectLast flag is set, select the last image on the page
    if (selectLast && filteredImages.length > 0) {
      return filteredImages[filteredImages.length - 1];
    }

    return filteredImages[0] || null;
  }, [filteredImages, currentImageId, selectLast]);

  // Update stable image when we have a valid current image
  useEffect(() => {
    if (currentImage) {
      setStableCurrentImage(currentImage);
    }
  }, [currentImage]);

  // Clean up selectLast flag after use
  useEffect(() => {
    if (selectLast && currentImage) {
      const params = new URLSearchParams(searchParams?.toString());
      params.delete("selectLast");
      params.set("image", currentImage._id);
      router.replace(`?${params.toString()}`);
    }
  }, [selectLast, currentImage, searchParams, router]);

  // Calculate pagination for server-side display
  const serverPagination = useMemo(() => {
    const totalImages = data?.pagination?.totalImages || 0;
    const totalPages = Math.ceil(totalImages / itemsPerPage);

    const paginationData = {
      totalImages,
      totalPages,
      currentPage: currentPage + 1, // Convert to 1-based for display
      itemsPerPage,
      startIndex: currentPage * itemsPerPage + 1,
      endIndex: Math.min((currentPage + 1) * itemsPerPage, totalImages),
      hasNextPage: currentPage < totalPages - 1,
      hasPreviousPage: currentPage > 0,
    };

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 [PAGINATION] serverPagination calculated:", paginationData);
    return paginationData;
  }, [data?.pagination?.totalImages, currentPage, itemsPerPage]);

  // Get current page of images for display (already paginated by server)
  const displayImages = useMemo(() => {
    // Server already returns the correct page, so just apply filename sorting if needed
    let images = [...filteredImages];

    // Apply filename-based sorting (client-side for responsive sorting)
    if (filters.sortBy === "filename") {
      images.sort((a, b) => {
        const aFilename = a.filename || "";
        const bFilename = b.filename || "";
        const comparison = aFilename.localeCompare(bFilename);
        return filters.sortDirection === "desc" ? -comparison : comparison;
      });
    }

    return images;
  }, [filteredImages, filters.sortBy, filters.sortDirection]);

  // Generate filter options from current page images (limited scope for performance)
  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    const categories = [
      "angle",
      "movement",
      "tod",
      "view",
      "side",
      "imageType",
    ];

    categories.forEach((category) => {
      const values = new Set<string>();
      allImages.forEach((image) => {
        const value = image.metadata?.[category];
        if (value && typeof value === "string") {
          values.add(value);
        }
      });
      options[category] = Array.from(values).sort();
    });

    console.log("🔄 [PROJECT GALLERY] Filter options from current page:", {
      optionsCount: Object.keys(options).length,
      currentPageImages: allImages.length,
    });
    return options;
  }, [allImages]);

  // Navigation functions with simple cross-page support
  const handleNext = useCallback(() => {
    if (!currentImage) return;

    const currentIndex = filteredImages.findIndex(
      (img) => img._id === currentImage._id
    );

    // Navigate within current page
    if (currentIndex < filteredImages.length - 1) {
      const nextImage = filteredImages[currentIndex + 1];
      const params = new URLSearchParams(searchParams?.toString());
      params.set("image", nextImage._id);
      router.push(`?${params.toString()}`);
      return;
    }

    // At last image of current page - go to next page if available
    const totalPages = serverPagination?.totalPages || 0;
    if (currentPage < totalPages - 1) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      const params = new URLSearchParams(searchParams?.toString());
      params.set("page", (nextPage + 1).toString());
      params.delete("image"); // Will select first image of new page
      router.push(`?${params.toString()}`);
    }
  }, [
    currentImage,
    filteredImages,
    searchParams,
    router,
    currentPage,
    serverPagination,
  ]);

  const handlePrev = useCallback(() => {
    if (!currentImage) return;

    const currentIndex = filteredImages.findIndex(
      (img) => img._id === currentImage._id
    );

    // Navigate within current page
    if (currentIndex > 0) {
      const prevImage = filteredImages[currentIndex - 1];
      const params = new URLSearchParams(searchParams?.toString());
      params.set("image", prevImage._id);
      router.push(`?${params.toString()}`);
      return;
    }

    // At first image of current page - go to previous page if available
    if (currentPage > 0) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      const params = new URLSearchParams(searchParams?.toString());
      params.set("page", (prevPage + 1).toString());
      params.set("selectLast", "true"); // Simple flag to select last image
      router.push(`?${params.toString()}`);
    }
  }, [currentImage, filteredImages, searchParams, router, currentPage]);

  const setMainImage = useCallback(
    (image: ExtendedImageType) => {
      const params = new URLSearchParams(searchParams?.toString());
      params.set("image", image._id);
      router.push(`?${params.toString()}`);
    },
    [searchParams, router]
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
    const allImageIds = new Set(displayImages.map((img) => img._id));
    setSelectedImages(allImageIds);
  }, [displayImages]);

  const handleSelectNone = useCallback(() => {
    setSelectedImages(new Set());
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedImages(new Set());
  }, []);

  // Page change handler
  const setCurrentPageHandler = useCallback(
    (page: number) => {
      setCurrentPage(page);
      const params = new URLSearchParams(searchParams?.toString());
      params.set("page", (page + 1).toString()); // Convert to 1-based for URL
      router.push(`?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Simplified upload completion handler with gallery refresh
  const handleUploadComplete = useCallback(() => {
    console.log(
      "🔄 [PROJECT GALLERY] Upload complete - refreshing gallery data"
    );

    // Close upload dialog
    setIsUploadDialogOpen(false);

    // Simple success toast
    toast({
      title: "Upload Complete! 🎉",
      description: "Images uploaded successfully",
      duration: 2000,
    });

    // Refresh gallery data without full page reload
    setTimeout(() => {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 [PROJECT GALLERY] Triggering API refetch");
      mutate(); // Refetch the gallery data
    }, 500); // Small delay to let dialog close
  }, [setIsUploadDialogOpen, toast, mutate]);

  // Show confirmation dialog for batch delete
  const handleDeleteSelected = useCallback(async () => {
    if (selectedImages.size === 0) {
      console.warn("🗑️ [PROJECT GALLERY] No images selected");
      return;
    }

    const imageIds = Array.from(selectedImages);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🗑️ [PROJECT GALLERY] Show delete confirmation for:", imageIds);

    setDeleteTargetImages(imageIds);
    setShowDeleteConfirm(true);
  }, [selectedImages]);

  // Actually perform the batch delete after confirmation
  const confirmDeleteSelected = useCallback(async () => {
    if (!api || deleteTargetImages.length === 0) {
      console.warn("🗑️ [PROJECT GALLERY] No API client or no images to delete");
      return;
    }

    console.log(
      "🗑️ [PROJECT GALLERY] Confirmed delete for:",
      deleteTargetImages
    );

    try {
      setIsDeletingImages(true);
      setShowDeleteConfirm(false);

      // Call the API with the project images endpoint
      await api.deleteWithBody(`/projects/${projectId}/images`, {
        imageIds: deleteTargetImages,
      });

      toast({
        title: "Images Deleted",
        description: `Successfully deleted ${deleteTargetImages.length} image(s)`,
      });

      // Clear selection
      setSelectedImages(new Set());
      setDeleteTargetImages([]);

      // Refresh gallery data
      mutate();
    } catch (error: any) {
      console.error("Error deleting images:", error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete images",
        variant: "destructive",
      });
    } finally {
      setIsDeletingImages(false);
    }
  }, [api, projectId, deleteTargetImages, toast, mutate]);

  // Show confirmation dialog for single delete
  const handleDeleteSingle = useCallback(async (imageId: string) => {
    console.log(
      "🗑️ [PROJECT GALLERY] Show delete confirmation for single image:",
      imageId
    );

    setDeleteTargetImages([imageId]);
    setShowDeleteConfirm(true);
  }, []);

  // Cancel delete confirmation
  const cancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setDeleteTargetImages([]);
  }, []);

  const reanalyzeImage = useCallback(
    async (imageId: string) => {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 [PROJECT GALLERY] Reanalyze image:", imageId);
      // TODO: Implement reanalysis functionality
      toast({
        title: "Feature Coming Soon",
        description: "Image reanalysis will be implemented soon",
      });
    },
    [toast]
  );

  const handleSetPrimaryImage = useCallback(
    async (imageId: string) => {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("⭐ [PROJECT GALLERY] Set primary image:", imageId);
      // TODO: Implement set primary functionality
      toast({
        title: "Feature Coming Soon",
        description: "Setting primary image will be implemented soon",
      });
    },
    [toast]
  );

  const loadMoreImages = useCallback(async () => {
    console.log(
      "📄 [PROJECT GALLERY] Load more images - using server-side pagination instead"
    );
    // Server-side pagination handles loading more images via page navigation
  }, []);

  // Mark initial load as complete when we have data or error
  useEffect(() => {
    if (!isLoading && (data || error)) {
      setIsInitialLoad(false);
    }
  }, [isLoading, data, error]);

  return {
    // Data
    images: allImages,
    filteredImages: displayImages,
    currentImage: stableCurrentImage, // Use stable image to prevent flicker
    filterOptions,
    isLoading,
    error,
    totalImagesAvailable: totalImagesAvailable || 0,
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
    isDeletingImages,
    showDeleteConfirm,
    deleteTargetImages,

    // Actions
    setFilters,
    setSearchQuery,
    setCurrentPage: setCurrentPageHandler,
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
    confirmDeleteSelected,
    cancelDelete,
    handleClearSelection,
    handleSelectAll,
    handleSelectNone,
    reanalyzeImage,
    handleSetPrimaryImage,
    loadMoreImages,
  };
}
