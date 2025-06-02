import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from "react";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import {
  CheckCircle,
  Star,
  Loader2,
  Trash2,
  MoreVertical,
  CheckSquare,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageInfoPanel } from "./ImageInfoPanel";
import { ExtendedImageType } from "@/types/gallery";
import { preloadImages } from "@/lib/imageLoader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

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
  onDeleteSingle?: (
    imageId: string,
    deleteFromStorage?: boolean
  ) => Promise<void>;
  onSelectAll?: () => void;
  onSelectNone?: () => void;
  onDeleteSelected?: (deleteFromStorage?: boolean) => Promise<void>;
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
  onDeleteSingle,
  onSelectAll,
  onSelectNone,
  onDeleteSelected,
  filters,
  searchQuery,
  serverPagination,
}: ImageThumbnailsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomLoadTriggerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);
  const preloadedPagesRef = useRef<Set<number | string>>(new Set());
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Early return if no images and no active filters/search
  // This prevents the "Page 1 of 0" flash during initial load
  const hasActiveFilters = Object.keys(filters || {}).length > 0;
  const hasActiveSearch = searchQuery?.trim();
  if (
    images.length === 0 &&
    !hasActiveFilters &&
    !hasActiveSearch &&
    !isLoadingMore
  ) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="bg-background rounded-lg p-4 flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading images...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  // Phase 2B Task 2: Get previous page images for back navigation preloading
  const getPreviousPageImages = useCallback(
    (targetPage: number): ExtendedImageType[] => {
      const prevPageStartIndex = targetPage * ITEMS_PER_PAGE;
      return images.slice(
        prevPageStartIndex,
        prevPageStartIndex + ITEMS_PER_PAGE
      );
    },
    [images]
  );

  // Phase 2B Task 2: Enhanced smart preloading with requestIdleCallback and adjacent page support
  const handleSmartPreloading = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }

    // Phase 2B Fix: Don't interfere with user navigation
    if (isNavigating) {
      return;
    }

    const container = scrollContainerRef.current;
    const scrollPercentage =
      (container.scrollTop + container.clientHeight) / container.scrollHeight;

    // Phase 2B Task 2: Preload next page when user reaches 80% of current page
    if (scrollPercentage >= 0.8) {
      const nextPage = currentPage + 1;

      if (!preloadedPagesRef.current.has(nextPage)) {
        const nextPageImages = getNextPageImages(nextPage);

        if (nextPageImages.length > 0) {
          preloadedPagesRef.current.add(nextPage);

          // Phase 2B Task 2: Use requestIdleCallback for non-blocking preload execution
          const preloadNextPage = () => {
            // Preload first 5 images of next page for faster pagination
            const imagesToPreload = nextPageImages
              .slice(0, 5)
              .map((img) => img.url);

            preloadImages(imagesToPreload, "thumbnail").catch((error) => {
              console.error("Failed to preload next page images:", error);
            });

            console.log(
              `🚀 Phase 2B: Preloaded ${imagesToPreload.length} images for next page ${nextPage + 1}`
            );
          };

          // Use requestIdleCallback if available, otherwise setTimeout
          if (typeof requestIdleCallback !== "undefined") {
            requestIdleCallback(preloadNextPage, { timeout: 2000 });
          } else {
            setTimeout(preloadNextPage, 100);
          }
        }
      }
    }

    // Phase 2B Task 2: Preload previous page for back navigation when user scrolls to top 20%
    if (scrollPercentage <= 0.2 && currentPage > 0) {
      const prevPage = currentPage - 1;
      const prevPageKey = `prev-${prevPage}`;

      if (!preloadedPagesRef.current.has(prevPageKey)) {
        const prevPageImages = getPreviousPageImages(prevPage);

        if (prevPageImages.length > 0) {
          preloadedPagesRef.current.add(prevPageKey);

          // Phase 2B Task 2: Use requestIdleCallback for non-blocking preload execution
          const preloadPrevPage = () => {
            // Preload last 5 images of previous page for faster back navigation
            const imagesToPreload = prevPageImages
              .slice(-5)
              .map((img) => img.url);

            preloadImages(imagesToPreload, "thumbnail").catch((error) => {
              console.error("Failed to preload previous page images:", error);
            });

            console.log(
              `🚀 Phase 2B: Preloaded ${imagesToPreload.length} images for previous page ${prevPage + 1}`
            );
          };

          // Use requestIdleCallback if available, otherwise setTimeout
          if (typeof requestIdleCallback !== "undefined") {
            requestIdleCallback(preloadPrevPage, { timeout: 2000 });
          } else {
            setTimeout(preloadPrevPage, 100);
          }
        }
      }
    }
  }, [currentPage, getNextPageImages, getPreviousPageImages, isNavigating]); // Phase 2B Fix: Add isNavigating dependency

  // Phase 2B Task 2: Re-enable and enhance scroll handler for smart preloading
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      setScrollTop(target.scrollTop);

      // Phase 2B Task 2: Enable smart preloading with debouncing
      // Clear existing timeout
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }

      // Debounce preloading to avoid excessive calls (reduced from 150ms to 100ms for better responsiveness)
      preloadTimeoutRef.current = setTimeout(() => {
        handleSmartPreloading();
      }, 100);
    },
    [handleSmartPreloading] // Phase 2B Task 2: Re-enable handleSmartPreloading dependency
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

  // Phase 2B Task 2: Enhanced preload adjacent images when current image changes (for gallery navigation)
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
      // Phase 2B Task 2: Use requestIdleCallback for non-blocking adjacent image preloading
      const preloadAdjacent = () => {
        preloadImages(adjacentImages, "medium").catch((error) => {
          console.error("Failed to preload adjacent images:", error);
        });

        console.log(
          `🚀 Phase 2B: Preloaded ${adjacentImages.length} adjacent images for gallery navigation`
        );
      };

      // Use requestIdleCallback if available, otherwise setTimeout
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(preloadAdjacent, { timeout: 1000 });
      } else {
        setTimeout(preloadAdjacent, 50);
      }
    }
  }, [currentImage?.id || currentImage?._id, images.length]); // Phase 2B Fix: Only depend on currentImage ID and images length to prevent excessive re-renders

  // Phase 2B Task 2: Re-enable adjacent image preloading effect with optimized dependencies
  useEffect(() => {
    // Only preload if we have a current image and it's stable (prevent rapid changes during navigation)
    if (currentImage) {
      const debounceTimer = setTimeout(() => {
        preloadAdjacentImages();
      }, 100); // Small debounce to prevent rapid re-triggers during navigation

      return () => clearTimeout(debounceTimer);
    }

    // Return undefined when no cleanup is needed
    return undefined;
  }, [currentImage?.id || currentImage?._id]); // Phase 2B Fix: Only depend on currentImage ID, not the full callback

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);

  // Phase 2B Task 2: Enhanced critical above-fold images for link preload
  const criticalImages = useMemo(() => {
    if (currentPage === 0 && paginatedImages.length > 0) {
      // First 6 images are considered above-fold and critical for LCP
      const criticalImageUrls = paginatedImages
        .slice(0, 6)
        .map((img) => img.url);

      // Phase 2B Task 2: Use requestIdleCallback to preload critical images without blocking
      if (criticalImageUrls.length > 0) {
        const preloadCritical = () => {
          preloadImages(criticalImageUrls, "thumbnail").catch((error) => {
            console.error("Failed to preload critical images:", error);
          });

          console.log(
            `🚀 Phase 2B: Preloaded ${criticalImageUrls.length} critical above-fold images`
          );
        };

        // Use requestIdleCallback if available, otherwise immediate execution
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(preloadCritical, { timeout: 500 });
        } else {
          setTimeout(preloadCritical, 0);
        }
      }

      return criticalImageUrls;
    }
    return [];
  }, [currentPage, paginatedImages.length]); // Phase 2B Fix: Only depend on currentPage and paginatedImages length to prevent excessive re-renders

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

            {/* Edit Mode Selection Controls */}
            {isEditMode && (
              <div className="flex items-center gap-1 ml-4">
                {onSelectAll && images.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSelectAll}
                    disabled={selectedImages.size === images.length}
                    title="Select all images"
                    className="h-7 w-7 p-0"
                  >
                    <CheckSquare className="w-3 h-3" />
                  </Button>
                )}

                {onSelectNone && selectedImages.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSelectNone}
                    title="Clear selection"
                    className="h-7 w-7 p-0"
                  >
                    <Square className="w-3 h-3" />
                  </Button>
                )}

                {onDeleteSelected && selectedImages.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeleteSelected()}
                    title={`Delete ${selectedImages.size} selected image${selectedImages.size !== 1 ? "s" : ""}`}
                    className="h-7 px-2"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {selectedImages.size}
                  </Button>
                )}
              </div>
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
                      onDeleteSingle={onDeleteSingle}
                      onSetPrimary={onSetPrimary}
                      onReanalyze={onReanalyze}
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
                          onDeleteSingle={onDeleteSingle}
                          onSetPrimary={onSetPrimary}
                          onReanalyze={onReanalyze}
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
  onDeleteSingle?: (
    imageId: string,
    deleteFromStorage?: boolean
  ) => Promise<void>;
  onSetPrimary?: (imageId: string) => void;
  onReanalyze?: (imageId: string) => void;
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
    onDeleteSingle,
    onSetPrimary,
    onReanalyze,
  }) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const imageId = image.id || image._id;

    const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async (deleteFromStorage: boolean) => {
      if (!onDeleteSingle) return;

      setIsDeleting(true);
      try {
        await onDeleteSingle(imageId, deleteFromStorage);
        setShowDeleteDialog(false);
      } catch (error) {
        console.error("Error deleting image:", error);
      } finally {
        setIsDeleting(false);
      }
    };

    const handleSetPrimary = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onSetPrimary) {
        onSetPrimary(imageId);
      }
    };

    const handleReanalyze = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onReanalyze) {
        onReanalyze(imageId);
      }
    };

    return (
      <>
        <div
          className={cn(
            "relative rounded-md overflow-hidden cursor-pointer group transition-all duration-300 ease-out transform",
            isCurrentImage
              ? "!border-2 !border-white ring-2 ring-white/20 !opacity-100 scale-105 shadow-lg"
              : isSelectedInEditMode
                ? "!border-2 !border-blue-500 !opacity-100 scale-102 shadow-md ring-1 ring-blue-300/30"
                : "!border-0 !opacity-60 hover:!opacity-100 hover:scale-102 hover:shadow-md"
          )}
          style={{
            border: isCurrentImage
              ? "2px solid white"
              : isSelectedInEditMode
                ? "2px solid #3b82f6"
                : "none",
            opacity: isCurrentImage || isSelectedInEditMode ? 1 : 0.6,
            transform: isCurrentImage
              ? "scale(1.05)"
              : isSelectedInEditMode
                ? "scale(1.02)"
                : "scale(1)",
          }}
          onMouseEnter={(e) => {
            if (!isCurrentImage && !isSelectedInEditMode) {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "scale(1.02)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isCurrentImage && !isSelectedInEditMode) {
              e.currentTarget.style.opacity = "0.6";
              e.currentTarget.style.transform = "scale(1)";
            }
          }}
          onClick={() => onImageSelect(imageId)}
        >
          <div className="relative overflow-hidden">
            <CloudflareImage
              src={image.url}
              alt={image.metadata?.description || "Thumbnail"}
              width={140}
              height={105}
              className="object-cover transition-transform duration-500 group-hover:scale-110 w-full h-auto"
              sizes="140px"
              variant="thumbnail"
              isAboveFold={isAboveFold}
              useIntersectionLazyLoad={!isAboveFold}
            />

            {/* Subtle gradient overlay for better readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* Enhanced selection overlay for edit mode */}
          {isEditMode && (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out",
                selectedImages.has(imageId)
                  ? "opacity-100 bg-blue-500/40 backdrop-blur-sm scale-100"
                  : "opacity-0 bg-black/0 group-hover:opacity-100 group-hover:bg-black/30 scale-95 group-hover:scale-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelection(imageId);
              }}
            >
              <div
                className={cn(
                  "transition-all duration-300 ease-out",
                  selectedImages.has(imageId)
                    ? "scale-100 text-white drop-shadow-lg"
                    : "scale-75 group-hover:scale-90 text-white/80"
                )}
              >
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          )}

          {/* Animated selection indicator badge */}
          {isEditMode && selectedImages.has(imageId) && (
            <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1 shadow-lg animate-in zoom-in-50 duration-300">
              <CheckCircle className="w-3 h-3" />
            </div>
          )}

          {/* Primary image indicator */}
          {image.metadata?.isPrimary && (
            <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
              <Star className="w-3 h-3" />
            </div>
          )}

          {/* Action Menu (visible on hover when not in edit mode) */}
          {!isEditMode && (
            <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 w-7 p-0 bg-white/90 hover:bg-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {onSetPrimary && !image.metadata?.isPrimary && (
                    <DropdownMenuItem onClick={handleSetPrimary}>
                      <Star className="w-4 h-4 mr-2" />
                      Set as Primary
                    </DropdownMenuItem>
                  )}
                  {onReanalyze && (
                    <DropdownMenuItem onClick={handleReanalyze}>
                      <Star className="w-4 h-4 mr-2" />
                      Re-analyze
                    </DropdownMenuItem>
                  )}
                  {(onSetPrimary || onReanalyze) && onDeleteSingle && (
                    <DropdownMenuSeparator />
                  )}
                  {onDeleteSingle && (
                    <DropdownMenuItem
                      onClick={handleDeleteClick}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Image
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Quick delete button (visible on hover in edit mode) */}
          {isEditMode && onDeleteSingle && (
            <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="destructive"
                className="h-7 w-7 p-0"
                onClick={handleDeleteClick}
                disabled={isDeleting}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Single Image Deletion Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Delete Image?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Choose how you want to delete this image:
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3 px-6">
              <div className="p-3 border rounded-md bg-muted/30">
                <div className="font-medium text-sm mb-1">Database Only</div>
                <div className="text-xs text-muted-foreground">
                  Remove from your gallery but keep file in cloud storage. Image
                  can be recovered if needed.
                </div>
              </div>

              <div className="p-3 border rounded-md bg-destructive/10 border-destructive/20">
                <div className="font-medium text-sm mb-1 text-destructive">
                  Database + Cloud Storage
                </div>
                <div className="text-xs text-muted-foreground">
                  Permanently delete from both gallery and cloud storage. This
                  action cannot be undone.
                </div>
              </div>
            </div>

            <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
              <AlertDialogCancel
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </AlertDialogCancel>

              <Button
                variant="outline"
                onClick={() => handleConfirmDelete(false)}
                disabled={isDeleting}
                className="w-full sm:w-auto"
              >
                Database Only
              </Button>

              <AlertDialogAction
                onClick={() => handleConfirmDelete(true)}
                disabled={isDeleting}
                className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Database + Storage"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
);
