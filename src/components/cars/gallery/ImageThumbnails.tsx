import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from "react";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import { CheckCircle, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageInfoPanel } from "./ImageInfoPanel";
import { ExtendedImageType } from "@/types/gallery";
import { preloadImages } from "@/lib/imageLoader";

interface ImageThumbnailsProps {
  images: ExtendedImageType[];
  currentImage: ExtendedImageType | undefined;
  selectedImages: Set<string>;
  currentPage: number;
  isEditMode: boolean;
  showImageInfo: boolean;
  isLoadingMore?: boolean;
  isNavigating?: boolean;
  totalImagesAvailable?: number;
  onImageSelect: (imageId: string) => void;
  onToggleSelection: (imageId: string) => void;
  onPageChange: (page: number) => void;
  onToggleInfo: (show: boolean) => void;
  onReanalyze: (imageId: string) => void;
  onSetPrimary?: (imageId: string) => void;
  onLoadMore?: () => void;
  filters?: Record<string, any>;
  searchQuery?: string;
  serverPagination?: {
    totalImages: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
    startIndex: number;
    endIndex: number;
  };
}

const ITEMS_PER_PAGE = 15;
const VIRTUAL_ITEM_HEIGHT = 105 + 8; // Thumbnail height + gap
const VIRTUAL_ITEMS_PER_ROW = 3;
const OVERSCAN = 3; // Render 3 extra rows above and below visible area

export function ImageThumbnails({
  images,
  currentImage,
  selectedImages,
  currentPage,
  isEditMode,
  showImageInfo,
  isLoadingMore = false,
  isNavigating,
  totalImagesAvailable,
  onImageSelect,
  onToggleSelection,
  onPageChange,
  onToggleInfo,
  onReanalyze,
  onSetPrimary,
  onLoadMore,
  filters,
  searchQuery,
  serverPagination,
}: ImageThumbnailsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomLoadTriggerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);
  const preloadedPagesRef = useRef<Set<number>>(new Set());
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate page information based on server pagination or filtered results
  const displayPagination = useMemo(() => {
    if (serverPagination) {
      // Use server-side pagination data for accurate filtered counts
      return {
        totalPages: serverPagination.totalPages,
        currentPageDisplay: serverPagination.currentPage,
        startIndex: serverPagination.startIndex,
        endIndex: serverPagination.endIndex,
        totalImages: serverPagination.totalImages,
        isServerPagination: true,
      };
    } else {
      // Fallback to client-side calculations
      const totalPages = Math.ceil(images.length / ITEMS_PER_PAGE);
      const startIndex = currentPage * ITEMS_PER_PAGE + 1;
      const endIndex = Math.min(
        (currentPage + 1) * ITEMS_PER_PAGE,
        images.length
      );

      return {
        totalPages,
        currentPageDisplay: currentPage + 1,
        startIndex,
        endIndex,
        totalImages: images.length,
        isServerPagination: false,
      };
    }
  }, [serverPagination, images.length, currentPage]);

  // Keep original calculations for component logic (intersection observer, etc.)
  const totalPages = Math.ceil(images.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const paginatedImages = images.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // VIRTUAL SCROLLING OPTIMIZATION: Calculate which thumbnails should be rendered
  const virtualizedImages = useMemo(() => {
    if (paginatedImages.length <= 20) {
      // For small sets, render all items for better UX
      return paginatedImages.map((image, index) => ({
        image,
        index: startIndex + index,
        isVirtual: false,
        row: 0,
        col: 0,
        top: 0,
      }));
    }

    // Calculate visible range based on scroll position
    const startRow = Math.floor(scrollTop / VIRTUAL_ITEM_HEIGHT);
    const endRow = Math.ceil(
      (scrollTop + containerHeight) / VIRTUAL_ITEM_HEIGHT
    );

    // Add overscan for smooth scrolling
    const startRowWithOverscan = Math.max(0, startRow - OVERSCAN);
    const endRowWithOverscan = Math.min(
      Math.ceil(paginatedImages.length / VIRTUAL_ITEMS_PER_ROW),
      endRow + OVERSCAN
    );

    const visibleImages = [];
    for (let row = startRowWithOverscan; row < endRowWithOverscan; row++) {
      for (let col = 0; col < VIRTUAL_ITEMS_PER_ROW; col++) {
        const imageIndex = row * VIRTUAL_ITEMS_PER_ROW + col;
        if (imageIndex < paginatedImages.length) {
          visibleImages.push({
            image: paginatedImages[imageIndex],
            index: startIndex + imageIndex,
            isVirtual: true,
            row,
            col,
            top: row * VIRTUAL_ITEM_HEIGHT,
          });
        }
      }
    }

    return visibleImages;
  }, [paginatedImages, scrollTop, containerHeight, startIndex]);

  // Smart preloading: calculate next page images for preloading
  const getNextPageImages = useCallback(
    (targetPage: number): ExtendedImageType[] => {
      const nextPageStartIndex = targetPage * ITEMS_PER_PAGE;
      return images.slice(
        nextPageStartIndex,
        nextPageStartIndex + ITEMS_PER_PAGE
      );
    },
    [images]
  );

  // Smart preloading: preload next page when user reaches 80% of current page
  const handleSmartPreloading = useCallback(() => {
    if (
      !scrollContainerRef.current ||
      preloadedPagesRef.current.has(currentPage + 1)
    ) {
      return;
    }

    const container = scrollContainerRef.current;
    const scrollPercentage =
      (container.scrollTop + container.clientHeight) / container.scrollHeight;

    // Trigger preloading when user reaches 80% of current page
    if (scrollPercentage >= 0.8) {
      const nextPage = currentPage + 1;
      const nextPageImages = getNextPageImages(nextPage);

      if (nextPageImages.length > 0) {
        preloadedPagesRef.current.add(nextPage);

        // Preload next page images with thumbnail variant
        const imageUrls = nextPageImages.map((img) => img.url);
        preloadImages(imageUrls, "thumbnail").catch((error) => {
          console.error("Failed to preload next page images:", error);
        });

        console.log(
          `🖼️ Preloaded ${imageUrls.length} images for page ${nextPage + 1}`
        );
      }
    }
  }, [currentPage, getNextPageImages]);

  // Debounced scroll handler for smart preloading
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      setScrollTop(target.scrollTop);

      // Temporarily disable smart preloading
      // // Clear existing timeout
      // if (preloadTimeoutRef.current) {
      //   clearTimeout(preloadTimeoutRef.current);
      // }

      // // Debounce preloading to avoid excessive calls
      // preloadTimeoutRef.current = setTimeout(() => {
      //   handleSmartPreloading();
      // }, 150);
    },
    [] // Remove handleSmartPreloading dependency temporarily
  );

  // Track container size for virtual scrolling calculations
  useEffect(() => {
    const updateContainerHeight = () => {
      if (scrollContainerRef.current) {
        setContainerHeight(scrollContainerRef.current.clientHeight);
      }
    };

    updateContainerHeight();
    window.addEventListener("resize", updateContainerHeight);

    return () => window.removeEventListener("resize", updateContainerHeight);
  }, []);

  // Calculate total pages based on total available images if provided
  const totalPagesAvailable = totalImagesAvailable
    ? Math.ceil(totalImagesAvailable / ITEMS_PER_PAGE)
    : totalPages;

  // Calculate display information for current filtered view
  const currentImageStart = startIndex + 1;
  const currentImageEnd = Math.min(startIndex + ITEMS_PER_PAGE, images.length);

  // Early trigger for loading more - when user is close to the end of loaded images
  const shouldTriggerEarlyLoad = useCallback(() => {
    if (!totalImagesAvailable || !onLoadMore || isLoadingMore || isNavigating)
      return false;

    // Don't trigger early loading if we have any active filters - user should see filtered results first
    const hasActiveFilters =
      Object.keys(filters || {}).length > 0 || searchQuery?.trim();
    if (hasActiveFilters) {
      return false;
    }

    const hasMoreImages = images.length < totalImagesAvailable;
    if (!hasMoreImages) {
      return false; // No more images to load from server
    }

    // OPTIMIZED: Only trigger when user is on the last page AND near the end of all loaded content
    // This prevents premature loading that can interfere with normal pagination
    const isOnLastAvailablePage =
      currentPage >= Math.ceil(images.length / ITEMS_PER_PAGE) - 1;

    if (!isOnLastAvailablePage) {
      return false; // User is not on the last page of loaded content yet
    }

    // Only trigger when we're truly running low on total content (less than 1 page remaining)
    const imagesRemaining = totalImagesAvailable - images.length;
    return imagesRemaining > 0 && imagesRemaining <= ITEMS_PER_PAGE;
  }, [
    totalImagesAvailable,
    onLoadMore,
    isLoadingMore,
    isNavigating,
    images.length,
    currentPage,
    filters,
    searchQuery,
  ]);

  // Effect to trigger early loading with debouncing
  useEffect(() => {
    if (shouldTriggerEarlyLoad()) {
      // Add a small delay to prevent triggering during rapid page changes
      const timer = setTimeout(() => {
        if (shouldTriggerEarlyLoad()) {
          // Check again after delay
          onLoadMore?.();
        }
      }, 300);

      return () => clearTimeout(timer);
    }
    // Return undefined when no cleanup is needed
    return undefined;
  }, [shouldTriggerEarlyLoad, onLoadMore]);

  // Intersection Observer for infinite scroll - FIXED to prevent auto-pagination
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoadingMore && !isNavigating) {
        // Check if we're at the last page and there might be more images to load from server
        const hasMoreImages = totalImagesAvailable
          ? images.length < totalImagesAvailable
          : false;

        // IMPORTANT FIX: Only load more images, never auto-change pages
        // Let the user manually control pagination through UI controls
        if (hasMoreImages && onLoadMore) {
          // Load more images if available from server
          onLoadMore();
        }
        // REMOVED: automatic page changing that was causing the runaway pagination
        // Users should control page navigation manually via pagination controls
      }
    },
    [
      onLoadMore,
      isLoadingMore,
      isNavigating,
      totalImagesAvailable,
      images.length,
      // Removed currentPage, totalPages, onPageChange to prevent auto-pagination
    ]
  );

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const trigger = bottomLoadTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(handleIntersection, {
      root: scrollContainerRef.current,
      rootMargin: "50px",
      threshold: 0.1,
    });

    observer.observe(trigger);

    return () => {
      observer.unobserve(trigger);
    };
  }, [handleIntersection]);

  // Preload adjacent images when current image changes (for gallery navigation)
  const preloadAdjacentImages = useCallback(() => {
    if (!currentImage) return;

    const currentIndex = images.findIndex(
      (img) => (img.id || img._id) === (currentImage.id || currentImage._id)
    );

    if (currentIndex === -1) return;

    const adjacentImages: string[] = [];

    // Preload previous image
    if (currentIndex > 0) {
      adjacentImages.push(images[currentIndex - 1].url);
    }

    // Preload next image
    if (currentIndex < images.length - 1) {
      adjacentImages.push(images[currentIndex + 1].url);
    }

    if (adjacentImages.length > 0) {
      preloadImages(adjacentImages, "medium").catch((error) => {
        console.error("Failed to preload adjacent images:", error);
      });

      console.log(`🖼️ Preloaded ${adjacentImages.length} adjacent images`);
    }
  }, [currentImage, images]);

  // Effect for preloading adjacent images
  useEffect(() => {
    // Temporarily disable preloading to prevent issues
    // preloadAdjacentImages();
  }, [preloadAdjacentImages]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);

  // Critical above-fold images for link preload
  const criticalImages = useMemo(() => {
    // Temporarily disable critical image preloading
    return [];
    // if (currentPage === 0) {
    //   // First 6 images are considered above-fold
    //   return paginatedImages.slice(0, 6).map((img) => img.url);
    // }
    // return [];
  }, [currentPage, paginatedImages]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Image Info Panel - slides down and pushes thumbnails */}
      {showImageInfo && currentImage && (
        <ImageInfoPanel
          currentImage={currentImage}
          onClose={() => onToggleInfo(false)}
          onReanalyze={onReanalyze}
          onSetPrimary={onSetPrimary}
        />
      )}

      <div className="bg-background rounded-lg p-4 flex flex-col flex-1 min-h-0">
        {/* Page Information Header */}
        <div className="flex justify-between items-center mb-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              Page {displayPagination.currentPageDisplay} of{" "}
              {displayPagination.totalPages}
            </span>
            {!displayPagination.isServerPagination &&
              totalPages !== totalPagesAvailable && (
                <span className="text-xs opacity-75">
                  ({totalPagesAvailable} total)
                </span>
              )}
          </div>
          <div className="flex items-center gap-3">
            <span>
              Showing {displayPagination.startIndex}-
              {displayPagination.endIndex} of {displayPagination.totalImages}
            </span>
            {!displayPagination.isServerPagination &&
              images.length !== totalImagesAvailable &&
              totalImagesAvailable && (
                <span className="text-xs opacity-75">
                  ({totalImagesAvailable} total)
                </span>
              )}
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
          {paginatedImages.length <= 20 ? (
            // Regular grid for small sets
            <div className="grid grid-cols-3 gap-2">
              {paginatedImages.map(
                (image: ExtendedImageType, index: number) => {
                  const imageId = image.id || image._id;
                  const currentImageId = currentImage?.id || currentImage?._id;
                  const isCurrentImage = Boolean(
                    imageId && currentImageId && imageId === currentImageId
                  );
                  const isSelectedInEditMode = selectedImages.has(imageId);
                  const isAboveFold = currentPage === 0 && index < 6;

                  return (
                    <ThumbnailItem
                      key={image._id || image.id}
                      image={image}
                      isCurrentImage={isCurrentImage}
                      isSelectedInEditMode={isSelectedInEditMode}
                      isAboveFold={isAboveFold}
                      isEditMode={isEditMode}
                      selectedImages={selectedImages}
                      onImageSelect={onImageSelect}
                      onToggleSelection={onToggleSelection}
                    />
                  );
                }
              )}
            </div>
          ) : (
            // Virtual scrolling for large sets
            <div
              className="relative"
              style={{
                height:
                  Math.ceil(paginatedImages.length / VIRTUAL_ITEMS_PER_ROW) *
                  VIRTUAL_ITEM_HEIGHT,
              }}
            >
              <div className="grid grid-cols-3 gap-2 absolute inset-0">
                {virtualizedImages.map(
                  ({ image, index, isVirtual, row, col, top }) => {
                    const imageId = image.id || image._id;
                    const currentImageId =
                      currentImage?.id || currentImage?._id;
                    const isCurrentImage = Boolean(
                      imageId && currentImageId && imageId === currentImageId
                    );
                    const isSelectedInEditMode = selectedImages.has(imageId);
                    const isAboveFold = index < 6;

                    return (
                      <div
                        key={image._id || image.id}
                        className="absolute"
                        style={
                          isVirtual
                            ? {
                                top: top,
                                left: `${(col / VIRTUAL_ITEMS_PER_ROW) * 100}%`,
                                width: `${100 / VIRTUAL_ITEMS_PER_ROW}%`,
                                height: VIRTUAL_ITEM_HEIGHT - 8,
                              }
                            : undefined
                        }
                      >
                        <ThumbnailItem
                          image={image}
                          isCurrentImage={isCurrentImage}
                          isSelectedInEditMode={isSelectedInEditMode}
                          isAboveFold={isAboveFold}
                          isEditMode={isEditMode}
                          selectedImages={selectedImages}
                          onImageSelect={onImageSelect}
                          onToggleSelection={onToggleSelection}
                        />
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Load more trigger for intersection observer */}
          <div ref={bottomLoadTriggerRef} className="h-1" />
        </div>
      </div>
    </div>
  );
}

// Separate ThumbnailItem component for better performance and reusability
const ThumbnailItem = React.memo<{
  image: ExtendedImageType;
  isCurrentImage: boolean;
  isSelectedInEditMode: boolean;
  isAboveFold: boolean;
  isEditMode: boolean;
  selectedImages: Set<string>;
  onImageSelect: (imageId: string) => void;
  onToggleSelection: (imageId: string) => void;
}>(
  ({
    image,
    isCurrentImage,
    isSelectedInEditMode,
    isAboveFold,
    isEditMode,
    selectedImages,
    onImageSelect,
    onToggleSelection,
  }) => {
    return (
      <div
        className={cn(
          "relative rounded-md overflow-hidden cursor-pointer group transition-all duration-300",
          isCurrentImage
            ? "!border-2 !border-white ring-2 ring-white/20 !opacity-100"
            : isSelectedInEditMode
              ? "!border-2 !border-blue-500 !opacity-100"
              : "!border-0 !opacity-60 hover:!opacity-100"
        )}
        style={{
          border: isCurrentImage
            ? "2px solid white"
            : isSelectedInEditMode
              ? "2px solid #3b82f6"
              : "none",
          opacity: isCurrentImage || isSelectedInEditMode ? 1 : 0.6,
        }}
        onMouseEnter={(e) => {
          if (!isCurrentImage && !isSelectedInEditMode) {
            e.currentTarget.style.opacity = "1";
          }
        }}
        onMouseLeave={(e) => {
          if (!isCurrentImage && !isSelectedInEditMode) {
            e.currentTarget.style.opacity = "0.6";
          }
        }}
        onClick={() => onImageSelect(image.id || image._id)}
      >
        <div className="relative overflow-hidden">
          <CloudflareImage
            src={image.url}
            alt={image.metadata?.description || "Thumbnail"}
            width={140}
            height={105}
            className="object-cover transition-transform duration-300 group-hover:scale-110 w-full h-auto"
            sizes="140px"
            variant="thumbnail"
            priority={isAboveFold}
            loading={isAboveFold ? "eager" : "lazy"}
          />
        </div>

        {/* Selection overlay for edit mode */}
        {isEditMode && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity",
              selectedImages.has(image.id || image._id)
                ? "opacity-100 bg-black/50"
                : "opacity-0 bg-black/0 group-hover:opacity-100 group-hover:bg-black/30"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection(image.id || image._id);
            }}
          >
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
        )}

        {/* Primary image indicator */}
        {image.metadata?.isPrimary && (
          <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
            <Star className="w-3 h-3" />
          </div>
        )}
      </div>
    );
  }
);
