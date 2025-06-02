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
import { MakesDropdown } from "@/components/ui/MakesDropdown";
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

// Helper function to build enhanced Cloudflare URL for car thumbnails
const getEnhancedImageUrl = (
  baseUrl: string,
  width?: string,
  quality?: string
) => {
  let params = [];
  // Always check for truthy values and non-empty strings
  if (width && width.trim() !== "") params.push(`w=${width}`);
  if (quality && quality.trim() !== "") params.push(`q=${quality}`);

  if (params.length === 0) return baseUrl;

  // Handle different Cloudflare URL formats
  // Format: https://imagedelivery.net/account/image-id/public
  // Should become: https://imagedelivery.net/account/image-id/w=400,q=85
  if (baseUrl.includes("imagedelivery.net")) {
    // Check if URL already has transformations (contains variant like 'public')
    if (baseUrl.endsWith("/public") || baseUrl.match(/\/[a-zA-Z]+$/)) {
      // Replace the last segment (usually 'public') with our parameters
      const urlParts = baseUrl.split("/");
      urlParts[urlParts.length - 1] = params.join(",");
      return urlParts.join("/");
    } else {
      // URL doesn't have a variant, append transformations
      return `${baseUrl}/${params.join(",")}`;
    }
  }

  // Fallback for other URL formats - try to replace /public if it exists
  return baseUrl.replace(/\/public$/, `/${params.join(",")}`);
};

function CarImage({ car, className = "aspect-video" }: CarImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blurDataUrl, setBlurDataUrl] = useState<string | null>(null);

  // Fetch image using primaryImageId like CarAvatar does
  useEffect(() => {
    setImageError(false);
    setImageUrl(null);
    setBlurDataUrl(null);
    setIsLoading(true);

    console.log("[CarImage] URL transformation:", {
      carId: car._id,
      primaryImageId: car.primaryImageId,
      imagesCount: car.images?.length || 0,
    });

    // If no primaryImageId, try to fall back to first image in images array
    if (!car.primaryImageId) {
      if (car.images && car.images.length > 0) {
        const firstImage = car.images[0];
        if (firstImage && firstImage.url) {
          const baseUrl = fixCloudflareImageUrl(firstImage.url);
          const fullUrl = getEnhancedImageUrl(baseUrl, "400", "85");
          const blurUrl = getEnhancedImageUrl(baseUrl, "50", "30");

          console.log("[CarImage] URL transformation:", {
            baseUrl,
            transformedUrl: fullUrl,
            params: "w=400,q=85",
          });

          setImageUrl(fullUrl);
          setBlurDataUrl(blurUrl);
          setIsLoading(false);
          return;
        }
      }
      setIsLoading(false);
      return;
    }

    const idString = car.primaryImageId.toString().trim();

    // Fetch image data from API
    const fetchImage = async () => {
      try {
        const response = await fetch(`/api/images/${idString}`, {
          headers: {
            "Cache-Control": "max-age=300",
          },
        });

        if (!response.ok) {
          // Try fallback to first image in images array
          if (car.images && car.images.length > 0) {
            const firstImage = car.images[0];
            if (firstImage && firstImage.url) {
              const baseUrl = fixCloudflareImageUrl(firstImage.url);
              const fullUrl = getEnhancedImageUrl(baseUrl, "400", "85");
              const blurUrl = getEnhancedImageUrl(baseUrl, "50", "30");

              console.log("[CarImage] URL transformation (fallback):", {
                baseUrl,
                transformedUrl: fullUrl,
                params: "w=400,q=85",
              });

              setImageUrl(fullUrl);
              setBlurDataUrl(blurUrl);
              setIsLoading(false);
              return;
            }
          }
          setImageError(true);
          setIsLoading(false);
          return;
        }

        const data = await response.json();

        if (!data || !data.url) {
          setImageError(true);
          setIsLoading(false);
          return;
        }

        // Use enhanced URL transformation with proper quality parameters
        const baseUrl = fixCloudflareImageUrl(data.url);
        const finalImageUrl = getEnhancedImageUrl(baseUrl, "400", "85");
        const blurImageUrl = getEnhancedImageUrl(baseUrl, "50", "30");

        console.log("[CarImage] URL transformation:", {
          baseUrl,
          transformedUrl: finalImageUrl,
          params: "w=400,q=85",
        });

        setImageUrl(finalImageUrl);
        setBlurDataUrl(blurImageUrl);
        setIsLoading(false);
      } catch (error) {
        console.warn("CarImage: Error fetching image:", error);
        // Try fallback to first image in images array
        if (car.images && car.images.length > 0) {
          const firstImage = car.images[0];
          if (firstImage && firstImage.url) {
            const baseUrl = fixCloudflareImageUrl(firstImage.url);
            const fullUrl = getEnhancedImageUrl(baseUrl, "400", "85");
            const blurUrl = getEnhancedImageUrl(baseUrl, "50", "30");

            console.log("[CarImage] URL transformation (error fallback):", {
              baseUrl,
              transformedUrl: fullUrl,
              params: "w=400,q=85",
            });

            setImageUrl(fullUrl);
            setBlurDataUrl(blurUrl);
            setIsLoading(false);
            return;
          }
        }
        setImageError(true);
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [car.primaryImageId, car.images]);

  if (!imageUrl || imageError) {
    // Fallback placeholder
    return (
      <div
        className={`${className} bg-muted rounded flex items-center justify-center`}
      >
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 bg-muted-foreground/20 rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6 text-muted-foreground"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-xs text-muted-foreground block">
            {car.make} {car.model}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} bg-muted rounded overflow-hidden relative`}>
      <Image
        src={imageUrl}
        alt={`${car.year} ${car.make} ${car.model}`}
        fill
        className="object-cover"
        placeholder={blurDataUrl ? "blur" : "empty"}
        blurDataURL={blurDataUrl || undefined}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        onLoad={() => setIsLoading(false)}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={false}
      />
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
  const [makes, setMakes] = useState<string[]>([]); // ✅ FIXED: Use string array for car filtering
  const [clients, setClients] = useState<Client[]>([]);
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

  const api = useAPI();

  // ✅ Build query params for critical path
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", currentPage.toString());
    params.set("pageSize", pageSize.toString());
    params.set("view", view);

    // Add filter parameters
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
    if (selectedMake) params.set("make", selectedMake);
    if (debouncedMinYear) params.set("minYear", debouncedMinYear);
    if (debouncedMaxYear) params.set("maxYear", debouncedMaxYear);
    if (filters.sort) params.set("sort", filters.sort);
    if (filters.clientId) params.set("clientId", filters.clientId);

    return params.toString();
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
    staleTime: 2 * 60 * 1000, // 2 minutes cache for cars list
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // ✅ BACKGROUND LOADING: Load makes and clients after critical path
  const fetchBackgroundData = useCallback(async () => {
    if (!api) return;

    try {
      resetTimer();

      const [makesResponse, clientsResponse] = await Promise.all([
        api.get("cars/makes"), // ✅ Uses enhanced endpoint with backward compatibility
        api.get("clients"),
      ]);

      const makesData = makesResponse as any;
      const clientsData = clientsResponse as any;

      // ✅ ENHANCED: Handle both simple string array (default) and enhanced response
      let makesArray: string[] = [];
      if (Array.isArray(makesData)) {
        // Direct array response (future enhanced format)
        makesArray = makesData.map((make: any) =>
          typeof make === "string" ? make : make.name
        );
      } else if (makesData.makes && Array.isArray(makesData.makes)) {
        // Wrapped response format (current backward-compatible format)
        makesArray = makesData.makes;
      }

      setMakes(makesArray);
      setClients(clientsData.clients || []);

      logTime("Background data fetch completed");
    } catch (error) {
      console.warn("⚠️ Background data fetch failed:", error);
      // Non-blocking error - critical path still works
    } finally {
      setBackgroundLoading(false);
    }
  }, [api, logTime, resetTimer]);

  // ✅ Load background data after component mounts (non-blocking)
  useEffect(() => {
    if (api && backgroundLoading) {
      // Small delay to let critical path render first
      const timer = setTimeout(fetchBackgroundData, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [api, backgroundLoading, fetchBackgroundData]);

  // ✅ Track when critical path data loads
  useEffect(() => {
    if (carsData && !carsLoading) {
      logTime("Critical path cars data loaded");
      setHasEverLoaded(true); // Mark that we've successfully loaded data
    }
  }, [carsData, carsLoading, logTime]);

  // ✅ Filter handlers with URL updating
  const updateURL = useCallback((newParams: URLSearchParams) => {
    newParams.set("page", "1"); // Reset to first page
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}?${newParams.toString()}`
    );
  }, []);

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

  // ✅ Update URL when debounced values change
  useEffect(() => {
    const newParams = new URLSearchParams(window.location.search);

    if (debouncedSearchQuery) {
      newParams.set("search", debouncedSearchQuery);
    } else {
      newParams.delete("search");
    }

    if (debouncedMinYear) {
      newParams.set("minYear", debouncedMinYear);
    } else {
      newParams.delete("minYear");
    }

    if (debouncedMaxYear) {
      newParams.set("maxYear", debouncedMaxYear);
    } else {
      newParams.delete("maxYear");
    }

    updateURL(newParams);
  }, [debouncedSearchQuery, debouncedMinYear, debouncedMaxYear, updateURL]);

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

  // ✅ Improved loading/empty state logic to prevent flashing
  const isInitialLoad = carsLoading && !hasEverLoaded; // Only initial load if we've never loaded before
  const isDataLoaded = !carsLoading && carsData;
  const hasNoCars = isDataLoaded && cars.length === 0;
  const isUpdatingResults = carsLoading && hasEverLoaded; // When we have loaded before but are loading new results

  // ✅ Debug: Log cars data to help identify key issues (moved after hook declarations)
  useEffect(() => {
    if (cars.length > 0 && process.env.NODE_ENV === "development") {
      const carsWithoutIds = cars.filter((car) => !car._id);
      if (carsWithoutIds.length > 0) {
        console.warn("🚨 Cars without _id detected:", carsWithoutIds);
      }
    }
  }, [cars]);

  // ✅ Loading state for critical path (after all hooks) - ONLY for true initial load
  if (isInitialLoad) {
    return (
      <CarsErrorBoundary>
        <PerformanceMonitor name="CarsPageOptimized" />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-6 py-8">
            {/* ✅ Header section - loads immediately */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <PageTitle title="Cars Collection" />
              <Link href="/cars/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Car
                </Button>
              </Link>
            </div>

            <CarsLoadingSpinner />
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
              <Link href="/cars/new">
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
            <Link href="/cars/new">
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
                  loading={backgroundLoading}
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
            {backgroundLoading && (
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
                  <div
                    key={car._id || `car-${car.make}-${car.model}-${car.year}`}
                    className="bg-card rounded-lg border p-4"
                  >
                    <CarImage car={car} className="aspect-video mb-3" />
                    <h3 className="font-semibold">
                      {car.year} {car.make} {car.model}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {car.status}
                    </p>
                    <Link href={`/cars/${car._id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                      >
                        View Details
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {cars.map((car) => (
                  <div
                    key={
                      car._id || `car-list-${car.make}-${car.model}-${car.year}`
                    }
                    className="bg-card rounded-lg border p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <CarImage car={car} className="w-16 h-16 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold">
                          {car.year} {car.make} {car.model}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {car.status}
                        </p>
                      </div>
                    </div>
                    <Link href={`/cars/${car._id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
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
                  <Link href="/cars/new">
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
