"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { useImages } from "@/hooks/use-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Car,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageData } from "@/app/images/columns";
import { useDebounce } from "use-debounce";
import { useCars } from "@/lib/hooks/query/useCars";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAPI } from "@/hooks/useAPI";

// Increase images per load for better UX
const IMAGES_PER_LOAD = 40;

// Import centralized URL transformation function
import { getEnhancedImageUrl } from "@/lib/imageUtils";

interface GalleryImageSelectorProps {
  selectedImageIds: string[];
  onImageSelect: (image: ImageData) => void;
  className?: string;
}

// Add this new component for pagination
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {currentPage > 3 && totalPages > 5 && (
        <>
          <Button variant="outline" size="sm" onClick={() => onPageChange(1)}>
            1
          </Button>
          <span className="text-muted-foreground">...</span>
        </>
      )}

      {pages.map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(page)}
        >
          {page}
        </Button>
      ))}

      {currentPage < totalPages - 2 && totalPages > 5 && (
        <>
          <span className="text-muted-foreground">...</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </Button>
        </>
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function GalleryImageSelector({
  selectedImageIds,
  onImageSelect,
  className,
}: GalleryImageSelectorProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const api = useAPI();

  // Fetch all cars by setting a high limit
  const { data: carsData } = useCars({ limit: 1000, sortDirection: "desc" });
  const [carSearchOpen, setCarSearchOpen] = useState(false);
  const [carSearchQuery, setCarSearchQuery] = useState("");

  // State for infinite loading
  const [allImages, setAllImages] = useState<ImageData[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreImages, setHasMoreImages] = useState(true);
  const [nextPage, setNextPage] = useState(2); // Start at 2 since first page loads via useImages

  // Refs for intersection observer
  const loadingTriggerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Use ref to access current allImages value without dependency issues
  const allImagesRef = useRef<ImageData[]>([]);

  // Update ref when allImages changes
  useEffect(() => {
    allImagesRef.current = allImages;
  }, [allImages]);

  // Get current filter values from URL (remove page param as we don't need it)
  const currentSearch = searchParams?.get("search") || undefined;
  const currentAngle = searchParams?.get("angle") || undefined;
  const currentMovement = searchParams?.get("movement") || undefined;
  const currentTod = searchParams?.get("tod") || undefined;
  const currentView = searchParams?.get("view") || undefined;
  const currentCarId = searchParams?.get("carId") || undefined;

  // Filter cars based on search query
  const filteredCars = React.useMemo(() => {
    if (!carsData?.cars) return [];
    const filtered = carsData.cars.filter((car) => {
      if (!carSearchQuery) return true;
      const searchStr = `${car.year} ${car.make} ${car.model}`.toLowerCase();
      const searchTerms = carSearchQuery.toLowerCase().split(" ");
      return searchTerms.every((term) => searchStr.includes(term));
    });
    return filtered;
  }, [carsData?.cars, carSearchQuery]);

  // Sort cars by year (newest first), then make, then model
  const sortedCars = React.useMemo(() => {
    return [...filteredCars].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.make !== b.make) return a.make.localeCompare(b.make);
      return a.model.localeCompare(b.model);
    });
  }, [filteredCars]);

  // Get current car name
  const currentCarName = React.useMemo(() => {
    if (!currentCarId || currentCarId === "all") return "All Cars";
    if (!carsData?.cars) return "Loading...";
    const car = carsData.cars.find((c) => c._id === currentCarId);
    return car ? `${car.year} ${car.make} ${car.model}` : "All Cars";
  }, [currentCarId, carsData?.cars]);

  // Load initial page
  const { data, isLoading, error, mutate } = useImages({
    limit: IMAGES_PER_LOAD,
    carId: currentCarId || "all",
    angle: currentAngle,
    movement: currentMovement,
    tod: currentTod,
    view: currentView,
    page: 1, // Always start with page 1
    search: currentSearch,
  });

  // Handle search with debounce
  const [debouncedSetSearch] = useDebounce((value: string) => {
    handleFilterChange("search", value || null);
  }, 500);

  // Handle search input
  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      debouncedSetSearch(e.target.value);
    },
    [debouncedSetSearch]
  );

  // Handle filter changes (reset to first page when filters change)
  const handleFilterChange = useCallback(
    (key: string, value: string | null) => {
      const newSearchParams = new URLSearchParams(
        searchParams?.toString() || ""
      );

      // Remove page parameter completely - we handle this with infinite loading
      newSearchParams.delete("page");

      if (value === null) {
        newSearchParams.delete(key);
      } else {
        newSearchParams.set(key, value);
      }

      router.replace(`${pathname}?${newSearchParams.toString()}`, {
        scroll: false,
      });

      // Reset infinite loading state when filters change
      setAllImages([]);
      setNextPage(2);
      setHasMoreImages(true);
    },
    [searchParams, router, pathname]
  );

  // Load more images function - FIXED: Use authenticated API client instead of direct fetch
  const loadMoreImages = useCallback(async () => {
    if (
      isLoadingMore ||
      !hasMoreImages ||
      isLoading ||
      !data?.pagination ||
      !api
    )
      return;

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 Loading more images, page:", nextPage);
    setIsLoadingMore(true);

    try {
      // Build query parameters for next page
      const queryParams = new URLSearchParams({
        page: nextPage.toString(),
        limit: IMAGES_PER_LOAD.toString(),
      });

      if (currentSearch) queryParams.append("search", currentSearch);
      if (currentCarId && currentCarId !== "all")
        queryParams.append("carId", currentCarId);
      if (currentAngle) queryParams.append("angle", currentAngle);
      if (currentMovement) queryParams.append("movement", currentMovement);
      if (currentTod) queryParams.append("tod", currentTod);
      if (currentView) queryParams.append("view", currentView);

      // Use authenticated API client instead of direct fetch
      const nextData = await api.get<{
        images: any[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          pages: number;
        };
      }>(`/images?${queryParams}`);

      console.log("📥 Received next page data:", {
        page: nextPage,
        imagesReceived: nextData?.images?.length || 0,
        totalImages: nextData?.pagination?.total || 0,
        currentTotal: allImagesRef.current.length,
      });

      if (nextData?.images?.length > 0) {
        // Convert newly loaded images to ImageData format
        const convertedNewImages = nextData.images.map((image: any) => ({
          _id: image._id,
          cloudflareId: image.cloudflareId || image._id,
          url: image.url,
          filename: image.filename,
          width: 0,
          height: 0,
          metadata: image.metadata || {},
          carId: image.carId || "",
          createdAt: image.createdAt,
          updatedAt: image.updatedAt,
        }));

        // Deduplicate images before adding to prevent React key conflicts
        const currentAllImages = allImagesRef.current;
        const existingIds = new Set(currentAllImages.map((img) => img._id));
        const newUniqueImages = convertedNewImages.filter(
          (img) => !existingIds.has(img._id)
        );
        console.log(
          `📋 Deduplication: ${convertedNewImages.length} received, ${newUniqueImages.length} unique, ${convertedNewImages.length - newUniqueImages.length} duplicates filtered`
        );

        if (newUniqueImages.length > 0) {
          const updatedImages = [...currentAllImages, ...newUniqueImages];
          const totalLoaded = updatedImages.length;
          const totalAvailable = nextData.pagination.total;
          const hasMore = totalLoaded < totalAvailable;

          console.log("📊 Update state:", {
            totalLoaded,
            totalAvailable,
            hasMore,
            nextPageWillBe: nextPage + 1,
          });

          // Update state in one batch to prevent cascading updates
          setAllImages(updatedImages);
          setNextPage((prev) => prev + 1);
          setHasMoreImages(hasMore);
        } else {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🚫 No new unique images to add");
          setNextPage((prev) => prev + 1);
        }
      } else {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🚫 No more images to load");
        setHasMoreImages(false);
      }
    } catch (error) {
      console.error("❌ Error loading more images:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    hasMoreImages,
    isLoading,
    nextPage,
    // Removed allImages.length to prevent infinite re-renders
    currentSearch,
    currentCarId,
    currentAngle,
    currentMovement,
    currentTod,
    currentView,
    data?.pagination,
    api,
  ]);

  // REMOVED: Refs for intersection observer (temporarily disabled)

  // TEMPORARILY DISABLED: Set up intersection observer for infinite scroll
  // TODO: Re-enable after fixing infinite render loops
  /*
  useEffect(() => {
    if (!loadingTriggerRef.current) return;

    // Disconnect existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer with stable callback using refs
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          // Use setTimeout to prevent direct state updates during render
          setTimeout(() => {
            if (
              hasMoreImagesRef.current &&
              !isLoadingMoreRef.current &&
              !isLoadingRef.current &&
              loadMoreImagesRef.current
            ) {
              // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎯 Intersection detected, loading more images...");
              loadMoreImagesRef.current();
            }
          }, 0);
        }
      },
      {
        rootMargin: "200px", // Load when 200px away from the trigger
        threshold: 0.1,
      }
    );

    observerRef.current.observe(loadingTriggerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []); // Empty dependency array to prevent re-creation
  */

  // Reset and load first page when data changes
  useEffect(() => {
    if (data?.images) {
      console.log("🔄 Initial data loaded:", {
        imagesCount: data.images.length,
        totalAvailable: data.pagination.total,
      });

      // Convert Image[] to ImageData[] - API returns _id, not id
      const convertedImages = data.images.map((image: any) => ({
        _id: image._id,
        cloudflareId: image.cloudflareId || image._id,
        url: image.url,
        filename: image.filename,
        width: 0,
        height: 0,
        metadata: image.metadata || {},
        carId: image.carId || "",
        createdAt: image.createdAt,
        updatedAt: image.updatedAt,
      }));

      // Deduplicate initial images to prevent any key conflicts
      const uniqueImages = convertedImages.filter(
        (img, index, arr) => arr.findIndex((i) => i._id === img._id) === index
      );
      console.log(
        `📋 Initial load deduplication: ${convertedImages.length} converted, ${uniqueImages.length} unique`
      );

      setAllImages(uniqueImages);
      setNextPage(2); // Next page to load is page 2
      setHasMoreImages(data.images.length < data.pagination.total);
    }
  }, [data]);

  // Effect to handle selection state changes
  useEffect(() => {
    mutate();
  }, [selectedImageIds, mutate]);

  // Handle image selection with optimistic update
  const handleImageSelection = useCallback(
    (image: ImageData) => {
      onImageSelect(image);
      mutate();
    },
    [onImageSelect, mutate]
  );

  // Use allImages for display (no need for complex merging since we control the flow)
  const displayImages = allImages;

  // Show loading while API client is initializing
  if (!api) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Authenticating...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="w-full md:w-[250px]">
            <Popover open={carSearchOpen} onOpenChange={setCarSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={carSearchOpen}
                  className="w-full justify-between"
                >
                  {currentCarName}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[250px] p-0 bg-background border shadow-md"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <Command
                  className="w-full rounded-lg bg-background"
                  shouldFilter={false}
                >
                  <CommandInput
                    placeholder="Search cars..."
                    value={carSearchQuery}
                    onValueChange={setCarSearchQuery}
                    className="h-9 border-none focus:ring-0"
                  />
                  <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
                    No cars found.
                  </CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto p-1">
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        handleFilterChange("carId", null);
                        setCarSearchQuery("");
                        setCarSearchOpen(false);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground !pointer-events-auto"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 pointer-events-none",
                          !currentCarId || currentCarId === "all"
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="pointer-events-none">All Cars</span>
                    </CommandItem>
                    {sortedCars.map((car) => (
                      <CommandItem
                        key={car._id}
                        value={`${car.year} ${car.make} ${car.model}`}
                        onSelect={() => {
                          handleFilterChange("carId", car._id);
                          setCarSearchQuery(
                            `${car.year} ${car.make} ${car.model}`
                          );
                          setCarSearchOpen(false);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground !pointer-events-auto"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 pointer-events-none",
                            currentCarId === car._id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <span className="pointer-events-none">
                          {car.year} {car.make} {car.model}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Input
            placeholder="Search images..."
            value={currentSearch || ""}
            onChange={handleSearchInput}
            className="w-full md:w-[250px]"
          />
        </div>

        <div className="flex gap-2">
          <Select
            value={currentAngle || "all"}
            onValueChange={(value) =>
              handleFilterChange("angle", value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Angle" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-md">
              <SelectItem value="all">All Angles</SelectItem>
              <SelectItem value="front">Front</SelectItem>
              <SelectItem value="front 3/4">Front 3/4</SelectItem>
              <SelectItem value="side">Side</SelectItem>
              <SelectItem value="rear 3/4">Rear 3/4</SelectItem>
              <SelectItem value="rear">Rear</SelectItem>
              <SelectItem value="overhead">Overhead</SelectItem>
              <SelectItem value="under">Under</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={currentView || "all"}
            onValueChange={(value) =>
              handleFilterChange("view", value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-md">
              <SelectItem value="all">All Views</SelectItem>
              <SelectItem value="exterior">Exterior</SelectItem>
              <SelectItem value="interior">Interior</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={currentMovement || "all"}
            onValueChange={(value) =>
              handleFilterChange("movement", value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Movement" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-md">
              <SelectItem value="all">All Movement</SelectItem>
              <SelectItem value="static">Static</SelectItem>
              <SelectItem value="rolling">Rolling</SelectItem>
              <SelectItem value="tracking">Tracking</SelectItem>
              <SelectItem value="panning">Panning</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={currentTod || "all"}
            onValueChange={(value) =>
              handleFilterChange("tod", value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time of Day" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-md">
              <SelectItem value="all">All Times</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="golden">Golden Hour</SelectItem>
              <SelectItem value="blue">Blue Hour</SelectItem>
              <SelectItem value="night">Night</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center text-destructive">Error loading images</div>
      ) : !displayImages?.length ? (
        <div className="text-center text-muted-foreground">No images found</div>
      ) : (
        <div className="space-y-6">
          {/* Display total count */}
          <div className="text-sm text-muted-foreground">
            Showing {displayImages.length} of {data?.pagination?.total || 0}{" "}
            images
            {hasMoreImages && " • Scroll down to load more"}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayImages.map((image, index) => {
              const isSelected = selectedImageIds.includes(image._id);
              return (
                <div
                  key={image._id}
                  className={cn(
                    "group relative rounded-md overflow-hidden bg-muted cursor-pointer min-h-[200px] flex flex-col",
                    isSelected && "ring-2 ring-primary"
                  )}
                  onClick={() => handleImageSelection(image)}
                >
                  <div className="relative flex-1 flex items-center justify-center bg-background">
                    <img
                      src={getEnhancedImageUrl(image.url, "600", "90")}
                      alt={image.filename}
                      className="max-w-full max-h-[300px] w-auto h-auto object-contain"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="h-8 w-8 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="w-full p-2 bg-muted/80 backdrop-blur-sm text-xs border-t border-border">
                    <div className="truncate text-muted-foreground">
                      {image.metadata?.angle && (
                        <span className="mr-2">{image.metadata.angle}</span>
                      )}
                      {image.metadata?.view && (
                        <span>{image.metadata.view}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Manual Load More Button (temporary replacement for infinite scroll) */}
          {hasMoreImages && (
            <div className="flex justify-center">
              <Button
                onClick={loadMoreImages}
                disabled={isLoadingMore || isLoading}
                variant="outline"
                className="px-8"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  "Load More Images"
                )}
              </Button>
            </div>
          )}

          {/* End message when all images are loaded */}
          {!hasMoreImages && displayImages.length > 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              All images loaded • {displayImages.length} total images
            </div>
          )}
        </div>
      )}
    </div>
  );
}
