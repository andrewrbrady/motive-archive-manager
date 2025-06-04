"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { useAPI } from "@/hooks/useAPI";
import { Car } from "@/types/car";
import { Make } from "@/lib/fetchMakes";
import { Client } from "@/types/contact";
import { PageTitle } from "@/components/ui/PageTitle";
import { LoadingSpinner } from "@/components/ui/loading";
import { CarsErrorBoundary } from "@/components/cars/CarsErrorBoundary";
import { Button } from "@/components/ui/button";
import { Plus, Search, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MakesDropdown, MakeData } from "@/components/ui/MakesDropdown";
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
import { usePrefetchAPI } from "@/hooks/useAPIQuery";

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

function CarImage({ car, className = "aspect-video" }: CarImageProps) {
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
        className={`${className} bg-muted rounded-md overflow-hidden flex items-center justify-center`}
      >
        <Skeleton className="w-full h-full animate-pulse" />
      </div>
    );
  }

  // ✅ Phase 1A: Non-blocking error state with retry
  if (hasImageError) {
    return (
      <div
        className={`${className} bg-muted rounded-md overflow-hidden flex items-center justify-center`}
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
    <div
      className={`${className} bg-muted rounded-md overflow-hidden relative`}
    >
      <Image
        src={finalImageUrl!}
        alt={`${car.year} ${car.make} ${car.model}`}
        fill
        className={`object-cover transition-opacity duration-300 ${
          imageLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
        quality={85}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
      />
    </div>
  );
}

// ✅ Phase 1C: Optimized Car Card Component with hover-based prefetching
interface CarCardProps {
  car: Car;
  view: "grid" | "list";
}

function CarCard({ car, view }: CarCardProps) {
  const { prefetch } = usePrefetchAPI();
  const [hoverTimeoutId, setHoverTimeoutId] = useState<NodeJS.Timeout | null>(
    null
  );

  // ✅ Debounced hover handler for car detail prefetching (300ms delay)
  const handleMouseEnter = useCallback(() => {
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
    // Clear timeout if user leaves before delay
    if (hoverTimeoutId) {
      clearTimeout(hoverTimeoutId);
      setHoverTimeoutId(null);
    }
  }, [hoverTimeoutId]);

  // ✅ Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutId) {
        clearTimeout(hoverTimeoutId);
      }
    };
  }, [hoverTimeoutId]);

  if (view === "grid") {
    return (
      <div
        key={car._id || `car-${car.make}-${car.model}-${car.year}`}
        className="bg-card rounded-lg border p-4"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <CarImage car={car} className="aspect-video mb-3" />
        <h3 className="font-semibold">
          {car.year} {car.make} {car.model}
        </h3>
        <p className="text-sm text-muted-foreground">{car.status}</p>
        <Link href={`/cars/${car._id}`} prefetch={true}>
          <Button variant="outline" size="sm" className="w-full mt-2">
            View Details
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      key={car._id || `car-list-${car.make}-${car.model}-${car.year}`}
      className="bg-card rounded-lg border p-4 flex items-center justify-between"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center gap-4">
        <CarImage car={car} className="w-16 h-16 flex-shrink-0" />
        <div>
          <h3 className="font-semibold">
            {car.year} {car.make} {car.model}
          </h3>
          <p className="text-sm text-muted-foreground">{car.status}</p>
        </div>
      </div>
      <Link href={`/cars/${car._id}`} prefetch={true}>
        <Button variant="outline" size="sm">
          View Details
        </Button>
      </Link>
    </div>
  );
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
  const [backgroundLoading, setBackgroundLoading] = useState(true);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);

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
    staleTime: 3 * 60 * 1000, // ✅ Phase 1A: 3min cache for cars data per guidelines
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    // ✅ PHASE 1B: Enable background refetch for seamless updates
    refetchOnMount: false,
  });

  // ✅ Phase 1A: Convert blocking background data to non-blocking useAPIQuery pattern
  const {
    data: makesResponse,
    isLoading: makesLoading,
    error: makesError,
  } = useAPIQuery<{ makes: string[] } | string[]>("cars/makes", {
    staleTime: 5 * 60 * 1000, // ✅ Phase 1A: 5min cache for shared data per guidelines
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: clientsData,
    isLoading: clientsLoading,
    error: clientsError,
  } = useAPIQuery<{ clients: Client[] }>("clients", {
    staleTime: 5 * 60 * 1000, // ✅ Phase 1A: 5min cache for shared data per guidelines
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    select: (data: any) => data?.clients || [],
  });

  // ✅ Phase 1A: Process makes data to MakeData[] format
  const makes: MakeData[] = useMemo(() => {
    if (!makesResponse) return [];

    if (Array.isArray(makesResponse)) {
      return makesResponse.map((make: any) =>
        typeof make === "string" ? make : make.name
      );
    }
    return makesResponse?.makes || [];
  }, [makesResponse]);

  // ✅ Phase 1A: Process background data safely with non-blocking patterns
  const clients = clientsData || [];
  const backgroundDataLoading = makesLoading || clientsLoading;

  // ✅ Phase 1A: Track loading states for progressive enhancement
  useEffect(() => {
    if (carsData && !carsLoading) {
      logTime("Critical path cars data loaded");
      setHasEverLoaded(true);
    }
  }, [carsData, carsLoading, logTime]);

  // ✅ Phase 1A: Update background loading state based on data availability
  useEffect(() => {
    if (makesResponse && clientsData) {
      setBackgroundLoading(false);
      logTime("Background data loaded");
    }
  }, [makesResponse, clientsData, logTime]);

  // ✅ PHASE 1B: Pagination prefetching for seamless user experience
  const { prefetch } = usePrefetchAPI();

  // ✅ PHASE 1C: Non-blocking URL update function - defer heavy operations
  const updateURL = useCallback((newParams: URLSearchParams) => {
    // Defer URL update to avoid blocking the render
    setTimeout(() => {
      newParams.set("page", "1"); // Reset to first page
      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.pushState({}, "", newUrl);
    }, 0);
  }, []);

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

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedMake("");
    setMinYear("");
    setMaxYear("");

    const newParams = new URLSearchParams(window.location.search);
    newParams.delete("search");
    newParams.delete("make");
    newParams.delete("minYear");
    newParams.delete("maxYear");
    updateURL(newParams);
  }, [updateURL]);

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

  // ✅ Phase 1A: Progressive loading - show skeleton cards instead of blocking spinner
  if (isInitialLoad) {
    return (
      <CarsErrorBoundary>
        <PerformanceMonitor name="CarsPageOptimized" />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-6 py-8">
            {/* ✅ Header section - loads immediately */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <PageTitle title="Cars Collection" />
              <Link href="/cars/new" prefetch={true}>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Car
                </Button>
              </Link>
            </div>

            {/* ✅ Phase 1A: Show filters interface immediately */}
            <div className="bg-card rounded-lg border p-6 mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
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
                <div className="w-full sm:w-48">
                  <MakesDropdown
                    value={selectedMake || "all"}
                    onValueChange={handleMakeChange}
                    makes={makes}
                    loading={backgroundDataLoading}
                    placeholder="All Makes"
                    allOptionLabel="All Makes"
                    allOptionValue="all"
                    loadingText="Loading makes..."
                  />
                </div>
                <div className="flex gap-2">
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
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* ✅ Phase 1A: Progressive loading message following established patterns */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                <span>
                  Loading cars... You can interact with the page while data
                  loads
                </span>
              </div>
            </div>

            {/* ✅ Phase 1A: Show skeleton cards instead of blocking spinner */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="bg-card rounded-lg border p-4"
                >
                  <Skeleton className="aspect-video mb-3 rounded" />
                  <Skeleton className="h-5 mb-2 rounded" />
                  <Skeleton className="h-4 mb-2 w-20 rounded" />
                  <Skeleton className="h-8 w-full mt-2 rounded" />
                </div>
              ))}
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
          <div className="container mx-auto px-6 py-8">
            {/* ✅ Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <PageTitle title="Cars Collection" />
              <Link href="/cars/new" prefetch={true}>
                <Button>
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
      </CarsErrorBoundary>
    );
  }

  // ✅ Once we've loaded initially, ALWAYS show the full interface
  return (
    <CarsErrorBoundary>
      <PerformanceMonitor name="CarsPageOptimized" />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          {/* ✅ Header section - loads immediately */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <PageTitle title="Cars Collection" />
            <Link href="/cars/new" prefetch={true}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add New Car
              </Button>
            </Link>
          </div>

          {/* ✅ Quick filters - functional immediately with debouncing */}
          <div className="bg-card rounded-lg border p-6 mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cars..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 pr-10"
                  />
                  {/* Search loading indicator */}
                  {isSearching && (
                    <div className="absolute right-3 top-3">
                      <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Make filter - enhanced when background data loads */}
              <div className="w-full sm:w-48">
                <MakesDropdown
                  value={selectedMake || "all"}
                  onValueChange={handleMakeChange}
                  makes={makes}
                  loading={backgroundDataLoading}
                  placeholder="All Makes"
                  allOptionLabel="All Makes"
                  allOptionValue="all"
                  loadingText="Loading makes..."
                />
              </div>

              {/* Year range */}
              <div className="flex gap-2">
                <div className="relative">
                  <Input
                    placeholder="Min Year"
                    value={minYear}
                    onChange={(e) => handleYearChange("min", e.target.value)}
                    className="w-24 pr-8"
                  />
                  {isYearFiltering && minYear !== debouncedMinYear && (
                    <div className="absolute right-2 top-3">
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Input
                    placeholder="Max Year"
                    value={maxYear}
                    onChange={(e) => handleYearChange("max", e.target.value)}
                    className="w-24 pr-8"
                  />
                  {isYearFiltering && maxYear !== debouncedMaxYear && (
                    <div className="absolute right-2 top-3">
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Background loading indicator */}
            {backgroundDataLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                <span>Loading advanced filters...</span>
              </div>
            )}
          </div>

          {/* ✅ View controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <ViewModeSelector currentView={view} />
              <PageSizeSelector
                currentPageSize={pageSize}
                options={[12, 24, 48, 96]}
              />
              <SortSelector currentSort={filters.sort || "createdAt_desc"} />
            </div>

            <div className="text-sm text-muted-foreground">
              Showing {cars.length} of {pagination.totalCount} cars
              {carsLoading && " (updating...)"}
            </div>
          </div>

          {/* ✅ Cars grid/list - Progressive enhancement pattern */}
          <div className="mb-8 relative">
            {/* Subtle loading overlay when updating existing data */}
            {isUpdatingResults && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                <div className="bg-card rounded-lg p-4 shadow-lg flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Updating cars...</span>
                </div>
              </div>
            )}

            {!hasEverLoaded && carsLoading ? (
              // Show loading spinner only for true initial load
              <CarsLoadingSpinner />
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {cars.map((car) => (
                  <CarCard
                    key={car._id || `car-${car.make}-${car.model}-${car.year}`}
                    car={car}
                    view={view}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {cars.map((car) => (
                  <CarCard
                    key={
                      car._id || `car-list-${car.make}-${car.model}-${car.year}`
                    }
                    car={car}
                    view={view}
                  />
                ))}
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
        </div>
      </div>
    </CarsErrorBoundary>
  );
}
