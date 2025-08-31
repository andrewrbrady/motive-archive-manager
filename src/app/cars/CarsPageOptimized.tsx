"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { Car } from "@/types/car";
import { CarsErrorBoundary } from "@/components/cars/CarsErrorBoundary";
import { Button } from "@/components/ui/button";
import { Plus, Search, ArrowRight, ZoomIn, ZoomOut, Edit, Trash2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
// Removed unused select and makes dropdown imports after toolbar simplification
import { useDebounce } from "@/hooks/useDebounce";
import Pagination from "@/components/Pagination";
import { ViewModeSelector } from "@/components/ui/ViewModeSelector";
import PageSizeSelector from "@/components/PageSizeSelector";
import SortSelector from "@/components/ui/SortSelector";
import {
  PerformanceMonitor,
  usePerformanceTimer,
} from "@/components/performance/PerformanceMonitor";
import { Skeleton } from "@/components/ui/skeleton";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { usePrefetchAPI, useAPIQueryClient } from "@/hooks/useAPIQuery";
import CarsListView from "@/components/cars/ListView";
import DeleteConfirmDialog from "@/components/ui/DeleteConfirmDialog";
import { MakesDropdown, MakeData } from "@/components/ui/MakesDropdown";
import AutoGrid from "@/components/ui/AutoGrid";
import { ToolbarRow } from "@/components/ui/ToolbarRow";

interface FilterParams {
  make?: string;
  minYear?: string;
  maxYear?: string;
  clientId?: string;
  sort?: string;
  search?: string;
}

interface CarsPageOptimizedProps {
  currentPage: number;
  pageSize: number;
  view: "grid" | "list";
  isEditMode: boolean;
  filters: FilterParams;
}

// ✅ Car Image component with proper image URL handling
interface CarImageProps {
  car: Car;
  className?: string;
  hoverImageUrl?: string | null;
  isHovered?: boolean;
}

// ✅ PHASE 1C: Optimized image URL helper - reduce blocking operations
const getEnhancedImageUrl = (
  baseUrl: string,
  width?: string,
  quality?: string
) => {
  // Early return for empty parameters to avoid unnecessary processing
  if (!width && !quality) return baseUrl;

  // Use faster string operations instead of array operations
  let paramString = "";
  if (width && width.trim()) paramString += `w=${width}`;
  if (quality && quality.trim()) {
    if (paramString) paramString += ",";
    paramString += `q=${quality}`;
  }

  if (!paramString) return baseUrl;

  // Handle Cloudflare URL formats with minimal string operations
  if (baseUrl.includes("imagedelivery.net")) {
    // Fast path: check for /public suffix and replace
    if (baseUrl.endsWith("/public")) {
      return baseUrl.slice(0, -7) + "/" + paramString; // Remove "/public" and add params
    }
    // Check for other variant patterns
    const lastSlashIndex = baseUrl.lastIndexOf("/");
    if (lastSlashIndex > 0 && /\/[a-zA-Z]+$/.test(baseUrl)) {
      return baseUrl.substring(0, lastSlashIndex + 1) + paramString;
    }
    return `${baseUrl}/${paramString}`;
  }

  // Fallback with simple replacement
  return baseUrl.replace(/\/public$/, `/${paramString}`);
};

function CarImage({ car, className = "aspect-video", hoverImageUrl, isHovered = false }: CarImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get primary image ID or fallback to first image
  const primaryImageId = car.primaryImageId?.toString() || car.images?.[0]?.url;
  const shouldFetchFromAPI =
    primaryImageId && !primaryImageId.includes("imagedelivery.net");

  // ✅ Phase 1A: Convert blocking fetch to non-blocking useAPIQuery pattern
  const {
    data: imageData,
    isLoading: isImageLoading,
    error: imageQueryError,
  } = useAPIQuery<{ url: string }>(`images/${primaryImageId}`, {
    enabled: !!(shouldFetchFromAPI && primaryImageId),
    staleTime: 5 * 60 * 1000, // 5 minutes cache for images
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // ✅ Log API errors for debugging without breaking functionality
  useEffect(() => {
    if (imageQueryError) {
      console.warn("CarImage: Failed to fetch image from API, trying fallback");
    }
  }, [imageQueryError]);

  // ✅ PHASE 1C: Optimized image URL computation - defer expensive operations
  const finalImageUrl = useMemo(() => {
    // Fast path: if we have direct Cloudflare URL, process immediately
    if (primaryImageId && primaryImageId.includes("imagedelivery.net")) {
      const baseUrl = fixCloudflareImageUrl(primaryImageId);
      return getEnhancedImageUrl(baseUrl, "400", "85");
    }

    // If we have API data, use it (already loaded)
    if (imageData?.url) {
      const baseUrl = fixCloudflareImageUrl(imageData.url);
      return getEnhancedImageUrl(baseUrl, "400", "85");
    }

    // Fast fallback: check first image without heavy processing
    const firstImage = car.images?.[0];
    if (firstImage?.url) {
      const baseUrl = fixCloudflareImageUrl(firstImage.url);
      return getEnhancedImageUrl(baseUrl, "400", "85");
    }

    return null;
  }, [primaryImageId, imageData?.url, car.images]);

  // Optional hover image (second image) for fade-through effect
  const hoverUrl = useMemo(() => {
    if (!hoverImageUrl) return null;
    const baseUrl = fixCloudflareImageUrl(hoverImageUrl);
    return getEnhancedImageUrl(baseUrl, "400", "85");
  }, [hoverImageUrl]);

  // ✅ Phase 1A: Implement non-blocking loading states
  const showImageLoading = shouldFetchFromAPI ? isImageLoading : isLoading;
  const hasImageError =
    imageQueryError || imageError || (!finalImageUrl && !showImageLoading);

  // Handle direct image loading for non-API images
  useEffect(() => {
    if (!shouldFetchFromAPI && finalImageUrl) {
      setIsLoading(false);
    }
  }, [shouldFetchFromAPI, finalImageUrl]);

  // Reset image loaded state when URL changes
  useEffect(() => {
    setImageLoaded(false);
  }, [finalImageUrl]);

  // ✅ Phase 1A: Progressive loading with skeleton states
  if (showImageLoading) {
    return (
      <div
        className={`${className} bg-muted overflow-hidden flex items-center justify-center`}
      >
        <Skeleton className="w-full h-full animate-pulse" />
      </div>
    );
  }

  // ✅ Phase 1A: Non-blocking error state with retry
  if (hasImageError) {
    return (
      <div
        className={`${className} bg-muted overflow-hidden flex items-center justify-center`}
      >
        <div className="text-xs text-muted-foreground text-center p-2">
          <div className="w-8 h-8 mx-auto mb-1 opacity-50">📷</div>
          <div>No image</div>
        </div>
      </div>
    );
  }

  // ✅ SMOOTH TRANSITION: Two-layer approach for blur-to-sharp transition
  return (
    <div className={`${className} bg-muted overflow-hidden relative`}>
      <Image
        src={finalImageUrl!}
        alt={`${car.year} ${car.make} ${car.model}`}
        fill
        className={`object-cover transition-opacity duration-300 hover-zoom-media ${
          imageLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
        quality={85}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
      />
      {hoverUrl && (
        <Image
          src={hoverUrl}
          alt={`${car.year} ${car.make} ${car.model} alternate`}
          fill
          className={`object-cover absolute inset-0 transition-opacity duration-300 hover-zoom-media ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          quality={85}
        />
      )}
    </div>
  );
}

// ✅ Phase 1C: Optimized Car Card Component with hover-based prefetching
interface CarCardProps {
  car: Car;
  view: "grid" | "list";
  isBatchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function CarCard({ car, view, isBatchMode = false, isSelected = false, onToggleSelect }: CarCardProps) {
  const { prefetch } = usePrefetchAPI();
  const [hoverTimeoutId, setHoverTimeoutId] = useState<NodeJS.Timeout | null>(
    null
  );
  const [isHovered, setIsHovered] = useState(false);

  // ✅ Debounced hover handler for car detail prefetching (300ms delay)
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    // Clear any existing timeout
    if (hoverTimeoutId) {
      clearTimeout(hoverTimeoutId);
    }

    // Set new timeout for debounced prefetching
    const timeoutId = setTimeout(() => {
      if (car._id) {
        prefetch(`cars/${car._id}`, 3 * 60 * 1000); // 3min cache for car details
      }
    }, 300);

    setHoverTimeoutId(timeoutId);
  }, [car._id, prefetch, hoverTimeoutId]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // Clear timeout if user leaves before delay
    if (hoverTimeoutId) {
      clearTimeout(hoverTimeoutId);
      setHoverTimeoutId(null);
    }
  }, [hoverTimeoutId]);

  // ✅ Cleanup timeout on unmount - use ref to avoid dependency issues
  useEffect(() => {
    return () => {
      if (hoverTimeoutId) {
        clearTimeout(hoverTimeoutId);
      }
    };
  }, []); // ✅ Empty dependency array to prevent infinite re-renders

  if (view === "grid") {
    const className =
      "block bg-card rounded-none border border-[hsl(var(--border-subtle))] hover:border-white hover:ring-1 hover:ring-white/70 transition-colors duration-200 overflow-hidden group";

    const inner = (
      <>
        <div className={`relative ${isBatchMode ? "cursor-pointer" : ""}`}>
          {isBatchMode && (
            <div className="absolute top-2 left-2 z-10 bg-background/80 rounded-full p-1.5 border border-[hsl(var(--border-subtle))]">
              <CheckCircle2 className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
            </div>
          )}
          <CarImage
            car={car}
            className={`aspect-video ${isSelected ? "ring-2 ring-primary" : ""}`}
            hoverImageUrl={car.images && car.images[1]?.url ? car.images[1].url : null}
            isHovered={isHovered}
          />
        </div>
        <div className="p-2 flex items-center justify-between">
          <h3 className="font-semibold truncate">
            {car.year} {car.make} {car.model}
          </h3>
          {!isBatchMode && (
            <ArrowRight className="ml-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </>
    );

    if (isBatchMode) {
      return (
        <div
          key={car._id || `car-${car.make}-${car.model}-${car.year}`}
          className={className}
          onClick={() => onToggleSelect && onToggleSelect(car._id)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          role="button"
          aria-pressed={isSelected}
        >
          {inner}
        </div>
      );
    }

    return (
      <Link
        href={`/cars/${car._id}`}
        prefetch={true}
        key={car._id || `car-${car.make}-${car.model}-${car.year}`}
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {inner}
      </Link>
    );
  }

  // List view is handled by parent using unified ListView component
  return null;
}

// ✅ Simple Loading Component
function CarsLoadingSpinner({
  message = "Loading cars...",
}: {
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * CarsPageOptimized - Progressive loading implementation for /cars
 * Based on /cars/[id] optimization patterns from CAR_TABS_OPTIMIZATION_GUIDE.md
 *
 * ARCHITECTURE:
 * - Critical Path: Cars list loads immediately (~800ms target)
 * - Background Loading: Makes and clients load asynchronously
 * - Progressive Enhancement: Filters become fully functional after background data loads
 */
export default function CarsPageOptimized({
  currentPage,
  pageSize,
  view,
  isEditMode,
  filters,
}: CarsPageOptimizedProps) {
  // ✅ COMPONENT STATE: Organize state logically
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  // Mount guard to avoid SSR/CSR hydration mismatches
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  // Cache-busting flag to bypass ISR/CDN after destructive actions
  const [cacheBust, setCacheBust] = useState<string>("");
  // Batch delete mode state
  const [isBatchMode, setIsBatchMode] = useState<boolean>(isEditMode);
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ✅ FILTER STATE: Separate filter state management
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [selectedMake, setSelectedMake] = useState(filters.make || "");
  const [minYear, setMinYear] = useState(filters.minYear || "");
  const [maxYear, setMaxYear] = useState(filters.maxYear || "");

  // ✅ DEBOUNCED FILTERS: Prevent excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const debouncedMinYear = useDebounce(minYear, 500);
  const debouncedMaxYear = useDebounce(maxYear, 500);

  // ✅ PERFORMANCE TRACKING: Add performance monitoring
  const { logTime, resetTimer } = usePerformanceTimer("CarsPageOptimized");
  // Zoom controls (like /images)
  const [zoomLevel, setZoomLevel] = useState(3);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("cars-zoom-level") : null;
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed >= 1 && parsed <= 5) setZoomLevel(parsed);
    }
  }, []);
  const zoomConfigs = {
    1: { cols: "md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8", label: "8" },
    2: { cols: "md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6", label: "6" },
    3: { cols: "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", label: "4" },
    4: { cols: "md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3", label: "3" },
    5: { cols: "md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2", label: "2" },
  } as const;
  const handleZoomIn = () => {
    if (zoomLevel < 5) {
      const next = zoomLevel + 1;
      setZoomLevel(next);
      if (typeof window !== "undefined") localStorage.setItem("cars-zoom-level", next.toString());
    }
  };
  const handleZoomOut = () => {
    if (zoomLevel > 1) {
      const next = zoomLevel - 1;
      setZoomLevel(next);
      if (typeof window !== "undefined") localStorage.setItem("cars-zoom-level", next.toString());
    }
  };

  // ✅ PHASE 1C: Optimized query key generation - reduce blocking computations
  const queryKey = useMemo(() => {
    // Use simple string concatenation instead of object manipulation to reduce blocking
    const keyParts = [
      currentPage.toString(),
      pageSize.toString(),
      view,
      debouncedSearchQuery || "",
      selectedMake || "",
      debouncedMinYear || "",
      debouncedMaxYear || "",
      filters.sort || "",
      filters.clientId || "",
    ];

    return keyParts.join("|");
  }, [
    currentPage,
    pageSize,
    view,
    debouncedSearchQuery,
    selectedMake,
    debouncedMinYear,
    debouncedMaxYear,
    filters.sort,
    filters.clientId,
  ]);

  // ✅ PHASE 1C: Optimized query params generation - defer heavy operations
  const queryParams = useMemo(() => {
    // Use direct string concatenation to avoid URLSearchParams overhead
    const params = [
      `page=${currentPage}`,
      `pageSize=${pageSize}`,
      `view=${view}`,
    ];

    // Only add non-empty parameters to minimize string operations
    if (debouncedSearchQuery)
      params.push(`search=${encodeURIComponent(debouncedSearchQuery)}`);
    if (selectedMake) params.push(`make=${encodeURIComponent(selectedMake)}`);
    if (debouncedMinYear) params.push(`minYear=${debouncedMinYear}`);
    if (debouncedMaxYear) params.push(`maxYear=${debouncedMaxYear}`);
    if (filters.sort) params.push(`sort=${filters.sort}`);
    if (filters.clientId) params.push(`clientId=${filters.clientId}`);
    if (cacheBust) params.push(`_=${cacheBust}`);

    return params.join("&");
  }, [
    currentPage,
    pageSize,
    view,
    debouncedSearchQuery,
    selectedMake,
    debouncedMinYear,
    debouncedMaxYear,
    filters.sort,
    filters.clientId,
    cacheBust,
  ]);

  // ✅ CRITICAL PATH: Cars data with React Query caching
  const {
    data: carsData,
    isLoading: carsLoading,
    error: carsError,
    refetch: refreshCars,
  } = useAPIQuery<{
    cars: Car[];
    pagination: {
      totalPages: number;
      totalCount: number;
      currentPage: number;
      pageSize: number;
    };
  }>(`cars?${queryParams}`, {
    queryKey: ["cars", queryKey], // ✅ PHASE 1B: Use optimized query key for better caching
    staleTime: 3 * 60 * 1000, // ✅ Phase 2A: 3min cache for critical cars data
    retry: 1, // ✅ Phase 2A: Reduce retry attempts for better performance
    refetchOnWindowFocus: false,
    // ✅ PHASE 1B: Enable background refetch for seamless updates
    refetchOnMount: false,
  });

  // ✅ Phase 1A: Convert blocking background data to non-blocking useAPIQuery pattern
  // Fetch makes for toolbar filter
  const {
    data: makesResponse,
    isLoading: makesLoading,
  } = useAPIQuery<{ makes: string[] } | string[]>("cars/makes", {
    staleTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const makes: MakeData[] = useMemo(() => {
    if (!makesResponse) return [];
    if (Array.isArray(makesResponse)) {
      return makesResponse.map((make: any) =>
        typeof make === "string" ? make : make.name
      );
    }
    return makesResponse?.makes || [];
  }, [makesResponse]);

  // ✅ Phase 1A: Track loading states for progressive enhancement
  useEffect(() => {
    if (carsData && !carsLoading) {
      logTime("Critical path cars data loaded");
      setHasEverLoaded(true);
    }
  }, [carsData, carsLoading, logTime]);

  // ✅ Phase 1A: Update background loading state based on data availability
  // Background clients fetching removed

  // ✅ PHASE 1B: Pagination prefetching for seamless user experience
  const { prefetch } = usePrefetchAPI();
  const queryClient = useAPIQueryClient();

  // ✅ PHASE 1C: Non-blocking URL update function - defer heavy operations
  const updateURL = useCallback((newParams: URLSearchParams) => {
    // Defer URL update to avoid blocking the render
    setTimeout(() => {
      newParams.set("page", "1"); // Reset to first page
      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.pushState({}, "", newUrl);
    }, 0);
  }, []);

  // Toggle batch mode and sync URL param `edit`
  const toggleBatchMode = useCallback(() => {
    setIsBatchMode((prev) => {
      const next = !prev;
      const params = new URLSearchParams(window.location.search);
      if (next) params.set("edit", "true");
      else params.delete("edit");
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.search = params.toString();
        window.history.pushState({}, "", url.toString());
      }, 0);
      if (!next) setSelectedCarIds([]);
      return next;
    });
  }, []);

  const onToggleSelect = useCallback((id: string) => {
    setSelectedCarIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const onDeleteSelected = useCallback(async () => {
    if (selectedCarIds.length === 0) return;
    // Optimistically remove cars from the current cache
    try {
      queryClient.setQueryData(["cars", queryKey], (prev: any) => {
        if (!prev) return prev;
        const remaining = (prev.cars || []).filter(
          (c: Car) => !selectedCarIds.includes(c._id)
        );
        const pagination = prev.pagination || {};
        const newTotal = Math.max((pagination.totalCount || 0) - selectedCarIds.length, 0);
        return {
          ...prev,
          cars: remaining,
          pagination: {
            ...pagination,
            totalCount: newTotal,
          },
        };
      });
    } catch {}
    try {
      await Promise.all(
        selectedCarIds.map((id) => fetch(`/api/cars/${id}`, { method: "DELETE" }))
      );
      setShowDeleteDialog(false);
      setSelectedCarIds([]);
      setIsBatchMode(false);
      // Invalidate and refetch to ensure freshness beyond CDN cache
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      // Bypass ISR/CDN cache for the next fetch
      setCacheBust(Date.now().toString());
      await refreshCars();
    } catch (err) {
      console.error("Batch delete cars failed", err);
    }
  }, [selectedCarIds, refreshCars, queryClient, queryKey]);

  // ✅ PHASE 1C: Optimized URL updates - batch and defer operations
  useEffect(() => {
    // Batch URL updates to avoid multiple blocking operations
    const updateBatchedParams = () => {
      const newParams = new URLSearchParams(window.location.search);
      let hasChanges = false;

      // Update search parameter
      if (debouncedSearchQuery) {
        if (newParams.get("search") !== debouncedSearchQuery) {
          newParams.set("search", debouncedSearchQuery);
          hasChanges = true;
        }
      } else {
        if (newParams.has("search")) {
          newParams.delete("search");
          hasChanges = true;
        }
      }

      // Update year parameters
      if (debouncedMinYear) {
        if (newParams.get("minYear") !== debouncedMinYear) {
          newParams.set("minYear", debouncedMinYear);
          hasChanges = true;
        }
      } else {
        if (newParams.has("minYear")) {
          newParams.delete("minYear");
          hasChanges = true;
        }
      }

      if (debouncedMaxYear) {
        if (newParams.get("maxYear") !== debouncedMaxYear) {
          newParams.set("maxYear", debouncedMaxYear);
          hasChanges = true;
        }
      } else {
        if (newParams.has("maxYear")) {
          newParams.delete("maxYear");
          hasChanges = true;
        }
      }

      // Only update URL if there are actual changes
      if (hasChanges) {
        updateURL(newParams);
      }
    };

    // Defer the batch update to avoid blocking
    const timeoutId = setTimeout(updateBatchedParams, 50);
    return () => clearTimeout(timeoutId);
  }, [debouncedSearchQuery, debouncedMinYear, debouncedMaxYear, updateURL]);

  // ✅ Filter handlers with URL updating
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleMakeChange = useCallback(
    (value: string) => {
      const newMake = value === "all" ? "" : value;
      setSelectedMake(newMake);

      const newParams = new URLSearchParams(window.location.search);
      if (newMake) {
        newParams.set("make", newMake);
      } else {
        newParams.delete("make");
      }
      updateURL(newParams);
    },
    [updateURL]
  );

  const handleYearChange = useCallback((type: "min" | "max", value: string) => {
    if (type === "min") {
      setMinYear(value);
    } else {
      setMaxYear(value);
    }
  }, []);

  // ✅ Track search loading state
  const isSearching = searchQuery !== debouncedSearchQuery;
  const isYearFiltering =
    minYear !== debouncedMinYear || maxYear !== debouncedMaxYear;

  // ✅ ALL HOOKS ABOVE THIS LINE - Extract derived state and variables
  const cars = carsData?.cars || [];
  const pagination = carsData?.pagination || {
    totalPages: 1,
    totalCount: 0,
    currentPage: 1,
    pageSize: 48,
  };

  const hasActiveFilters =
    debouncedSearchQuery ||
    selectedMake ||
    debouncedMinYear ||
    debouncedMaxYear;

  // ✅ Phase 1A: Improved loading states for progressive loading strategy
  const isInitialLoad = carsLoading && !hasEverLoaded;
  const isDataLoaded = !carsLoading && carsData;
  const hasNoCars = isDataLoaded && cars.length === 0;
  const isUpdatingResults = carsLoading && hasEverLoaded;

  // ✅ Debug: Log cars data to help identify key issues (moved after hook declarations)
  useEffect(() => {
    if (cars.length > 0 && process.env.NODE_ENV === "development") {
      const carsWithoutIds = cars.filter((car) => !car._id);
      if (carsWithoutIds.length > 0) {
        console.warn("🚨 Cars without _id detected:", carsWithoutIds);
      }
    }
  }, [cars]);

  // ✅ PHASE 1C: Optimized pagination prefetching - reduce blocking operations
  useEffect(() => {
    if (!carsLoading && pagination.totalPages > 1) {
      // Prefetch next and previous pages for seamless pagination
      const nextPage = pagination.currentPage + 1;
      const prevPage = pagination.currentPage - 1;

      // ✅ PHASE 1C: Simplified query building - use direct string operations
      const buildPrefetchQuery = (page: number) => {
        const params = [`page=${page}`, `pageSize=${pageSize}`, `view=${view}`];

        // Only add non-empty parameters to minimize operations
        if (debouncedSearchQuery)
          params.push(`search=${encodeURIComponent(debouncedSearchQuery)}`);
        if (selectedMake)
          params.push(`make=${encodeURIComponent(selectedMake)}`);
        if (debouncedMinYear) params.push(`minYear=${debouncedMinYear}`);
        if (debouncedMaxYear) params.push(`maxYear=${debouncedMaxYear}`);
        if (filters.sort) params.push(`sort=${filters.sort}`);
        if (filters.clientId) params.push(`clientId=${filters.clientId}`);

        return params.join("&");
      };

      // Defer prefetching to avoid blocking current operations
      setTimeout(() => {
        // Prefetch next page (higher priority)
        if (nextPage <= pagination.totalPages) {
          const nextPageQuery = buildPrefetchQuery(nextPage);
          prefetch(`cars?${nextPageQuery}`, 2 * 60 * 1000); // 2min cache for prefetched data
        }

        // Prefetch previous page (lower priority)
        if (prevPage >= 1) {
          const prevPageQuery = buildPrefetchQuery(prevPage);
          prefetch(`cars?${prevPageQuery}`, 2 * 60 * 1000);
        }
      }, 100); // Small delay to avoid blocking main thread
    }
  }, [
    carsLoading,
    pagination.currentPage,
    pagination.totalPages,
    pageSize,
    view,
    debouncedSearchQuery,
    selectedMake,
    debouncedMinYear,
    debouncedMaxYear,
    filters.sort,
    filters.clientId,
    prefetch,
  ]);

  // ✅ Phase 1A: Progressive loading & hydration-safe initial pass
  // Also render skeleton until mounted to keep SSR/CSR markup identical
  if (!isMounted || isInitialLoad) {
    return (
      <CarsErrorBoundary>
        <PerformanceMonitor name="CarsPageOptimized" />
        <div className="min-h-screen bg-background">
          <div className="container-wide px-6 py-8">
            <div className="space-y-6 sm:space-y-8">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-3">
              <ViewModeSelector currentView={view} />
              <PageSizeSelector currentPageSize={pageSize} options={[12,24,48,96]} />
              <SortSelector currentSort={filters.sort || "createdAt_desc"} />
              {view === "grid" && (
                <div className="flex items-center gap-1 border rounded-md">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs px-2 text-muted-foreground">
                    {zoomConfigs[zoomLevel as keyof typeof zoomConfigs].label}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 5}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <MakesDropdown
                value={selectedMake || "all"}
                onValueChange={handleMakeChange}
                makes={makes}
                loading={makesLoading}
                placeholder="All Makes"
                allOptionLabel="All Makes"
                allOptionValue="all"
                loadingText="Loading makes..."
                className="w-64 min-w-[16rem]"
                triggerClassName="whitespace-nowrap"
              />
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Min Year"
                  value={minYear}
                  onChange={(e) => handleYearChange("min", e.target.value)}
                  className="w-24"
                />
                <Input
                  placeholder="Max Year"
                  value={maxYear}
                  onChange={(e) => handleYearChange("max", e.target.value)}
                  className="w-24"
                />
              </div>
            </div>
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cars..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              {!isBatchMode ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="h-9 px-3 bg-transparent border border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] hover:border-white hover:bg-transparent transition-colors"
                    onClick={toggleBatchMode}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Link href="/cars/new" prefetch={true}>
                    <Button
                      variant="ghost"
                      className="h-9 px-3 bg-transparent border border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] hover:border-white hover:bg-transparent transition-colors"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Car
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{selectedCarIds.length} selected</span>
                  <Button
                    variant="destructive"
                    size="icon"
                    disabled={selectedCarIds.length === 0}
                    onClick={() => setShowDeleteDialog(true)}
                    aria-label="Delete selected cars"
                    title="Delete selected"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-9 px-3"
                    onClick={toggleBatchMode}
                  >
                    Done
                  </Button>
                </div>
              )}
            </div>

            {/* ✅ Phase 1A: Show skeleton cards instead of blocking spinner */}
            <AutoGrid
              zoomLevel={zoomLevel}
              colsMap={zoomConfigs as any}
              baseCols="grid grid-cols-1"
              gap="gap-6"
            >
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="bg-card rounded-none border overflow-hidden">
                  <Skeleton className="aspect-video" />
                  <div className="p-2">
                    <Skeleton className="h-5 w-2/3" />
                  </div>
                  <div className="h-9 border-t border-[hsl(var(--border))]/40" />
                </div>
              ))}
            </AutoGrid>
            </div>
          </div>
        </div>
      </CarsErrorBoundary>
    );
  }

  // ✅ Error state for critical path (after all hooks)
  if (carsError) {
    return (
      <CarsErrorBoundary>
        <div className="min-h-screen bg-background">
          <div className="container-wide px-6 py-8">
            <div className="space-y-6 sm:space-y-8">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-3">
              <ViewModeSelector currentView={view} />
              <PageSizeSelector currentPageSize={pageSize} options={[12,24,48,96]} />
              <SortSelector currentSort={filters.sort || "createdAt_desc"} />
              <MakesDropdown
                value={selectedMake || "all"}
                onValueChange={handleMakeChange}
                makes={makes}
                loading={makesLoading}
                placeholder="All Makes"
                allOptionLabel="All Makes"
                allOptionValue="all"
                loadingText="Loading makes..."
                className="w-64 min-w-[16rem]"
                triggerClassName="whitespace-nowrap"
              />
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Min Year"
                  value={minYear}
                  onChange={(e) => handleYearChange("min", e.target.value)}
                  className="w-24"
                />
                <Input
                  placeholder="Max Year"
                  value={maxYear}
                  onChange={(e) => handleYearChange("max", e.target.value)}
                  className="w-24"
                />
              </div>
            </div>
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cars..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Link href="/cars/new" prefetch={true}>
                <Button
                  variant="ghost"
                  className="h-9 px-3 bg-transparent border border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] hover:border-white hover:bg-transparent transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Car
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">
                  Error Loading Cars
                </h2>
                <p className="text-muted-foreground mb-4">
                  There was a problem loading the cars list.
                </p>
                <Button onClick={() => refreshCars()}>Try Again</Button>
              </div>
            </div>
            </div>
          </div>
        </div>
      </CarsErrorBoundary>
    );
  }

  // ✅ Once we've loaded initially, ALWAYS show the full interface
  return (
    <CarsErrorBoundary>
      <PerformanceMonitor name="CarsPageOptimized" />
      <div className="min-h-screen bg-background">
        <div className="container-wide px-6 py-8">
          <div className="space-y-6 sm:space-y-8">
          {/* Unified toolbar */}
          <ToolbarRow
            left={
              <>
                <ViewModeSelector currentView={view} />
                <PageSizeSelector currentPageSize={pageSize} options={[12, 24, 48, 96]} />
                <SortSelector currentSort={filters.sort || "createdAt_desc"} />
                {view === "grid" && (
                  <div className="flex items-center gap-1 border rounded-md">
                    <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 1} className="h-8 w-8 p-0">
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs px-2 text-muted-foreground">
                      {zoomConfigs[zoomLevel as keyof typeof zoomConfigs].label}
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 5} className="h-8 w-8 p-0">
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <MakesDropdown
                  value={selectedMake || "all"}
                  onValueChange={handleMakeChange}
                  makes={makes}
                  loading={makesLoading}
                  placeholder="All Makes"
                  allOptionLabel="All Makes"
                  allOptionValue="all"
                  loadingText="Loading makes..."
                  className="w-64 min-w-[16rem]"
                  triggerClassName="whitespace-nowrap"
                />
                <div className="flex items-center gap-2">
                  <Input placeholder="Min Year" value={minYear} onChange={(e) => handleYearChange("min", e.target.value)} className="w-24" />
                  <Input placeholder="Max Year" value={maxYear} onChange={(e) => handleYearChange("max", e.target.value)} className="w-24" />
                </div>
              </>
            }
            right={
              !isBatchMode ? (
                <>
                  <div className="relative mr-2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search cars..." value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9 pr-10" />
                    {isSearching && (
                      <div className="absolute right-3 top-3">
                        <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" className="h-9 px-3 bg-transparent border border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] hover:border-white hover:bg-transparent transition-colors" onClick={toggleBatchMode}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Link href="/cars/new" prefetch={true}>
                    <Button variant="ghost" className="h-9 px-3 bg-transparent border border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] hover:border-white hover:bg-transparent transition-colors">
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Car
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground mr-2">{selectedCarIds.length} selected</span>
                  <Button variant="destructive" size="icon" disabled={selectedCarIds.length === 0} onClick={() => setShowDeleteDialog(true)} aria-label="Delete selected cars" title="Delete selected">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" className="h-9 px-3 ml-2" onClick={toggleBatchMode}>
                    Done
                  </Button>
                </>
              )
            }
          />

          {/* (Old filters and counts removed per updated layout) */}

          {/* ✅ Cars grid/list - Progressive enhancement pattern */}
          <div className="relative">
            {/* Subtle loading overlay when updating existing data */}
            {isUpdatingResults && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="bg-card rounded-none p-4 shadow-lg flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Updating cars...</span>
                </div>
              </div>
            )}

            {!hasEverLoaded && carsLoading ? (
              // Show loading spinner only for true initial load
              <CarsLoadingSpinner />
            ) : view === "grid" ? (
              <AutoGrid
                zoomLevel={zoomLevel}
                colsMap={zoomConfigs as any}
                baseCols="grid grid-cols-1"
                gap="gap-6"
              >
                {cars.map((car) => (
                  <CarCard
                    key={car._id || `car-${car.make}-${car.model}-${car.year}`}
                    car={car}
                    view={view}
                    isBatchMode={isBatchMode}
                    isSelected={selectedCarIds.includes(car._id)}
                    onToggleSelect={onToggleSelect}
                  />
                ))}
              </AutoGrid>
          ) : (
              <div className="space-y-4">
                <CarsListView cars={cars} />
              </div>
            )}

            {/* Only show empty state when we have confirmed no cars after loading */}
            {hasNoCars && (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">No cars found</h3>
                <p className="text-muted-foreground">
                  {hasActiveFilters
                    ? "Try adjusting your filters or search terms."
                    : "Start by adding your first car to the collection."}
                </p>
                {!hasActiveFilters && (
                  <Link href="/cars/new" prefetch={true}>
                    <Button className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Car
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* ✅ Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
              />
            </div>
          )}
          {/* Delete confirmation dialog */}
          <DeleteConfirmDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onConfirm={onDeleteSelected}
            title={`Delete ${selectedCarIds.length} car${selectedCarIds.length === 1 ? "" : "s"}?`}
            description={
              selectedCarIds.length === 1
                ? "This car will be permanently deleted. This action cannot be undone."
                : "All selected cars will be permanently deleted. This action cannot be undone."
            }
            confirmText={selectedCarIds.length === 1 ? "Delete Car" : "Delete Selected"}
          />
          </div>
        </div>
      </div>
    </CarsErrorBoundary>
  );
}
