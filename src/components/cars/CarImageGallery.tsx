"use client";

import React, { useEffect, useCallback, useRef, useMemo } from "react";
import { useImageGallery } from "@/hooks/useImageGallery";
import { ImageFilters } from "./gallery/ImageFilters";
import { ImageViewer } from "./gallery/ImageViewer";
import { ImageThumbnails } from "./gallery/ImageThumbnails";
import { ImageModal } from "./gallery/ImageModal";
import { UploadDialog } from "./gallery/UploadDialog";
import EditModeToggle from "./EditModeToggle";
import { NoResultsFound } from "./gallery/NoResultsFound";
import { useToast } from "@/components/ui/use-toast";
import { useRouter, useSearchParams } from "next/navigation";

interface CarImageGalleryProps {
  carId: string;
  showFilters?: boolean;
  vehicleInfo?: any;
  onFilterOptionsChange?: (options: Record<string, string[]>) => void;
  onUploadStarted?: () => void;
  onUploadEnded?: () => void;
}

export function CarImageGallery({
  carId,
  showFilters = true,
  vehicleInfo,
  onFilterOptionsChange,
  onUploadStarted,
  onUploadEnded,
}: CarImageGalleryProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastCopyTimeRef = useRef<number>(0);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-determine if this car has images to show appropriate loading state
  const hasImages = useMemo(() => {
    const imageIds = vehicleInfo?.imageIds?.length || 0;
    const processedImageIds = vehicleInfo?.processedImageIds?.length || 0;
    return imageIds > 0 || processedImageIds > 0;
  }, [vehicleInfo?.imageIds, vehicleInfo?.processedImageIds]);

  const {
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
  } = useImageGallery(carId, vehicleInfo);

  // Function to toggle edit mode via URL parameters
  const toggleEditMode = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (isEditMode) {
      params.delete("mode");
    } else {
      params.set("mode", "edit");
    }
    router.push(`?${params.toString()}`);
  }, [isEditMode, searchParams, router]);

  // Enhanced URL copying with support for highest quality
  const copyImageUrl = useCallback(
    (useHighestQuality = false) => {
      if (!currentImage) return;

      let urlToCopy = currentImage.url;

      if (currentImage.url.includes("imagedelivery.net")) {
        // For Cloudflare images, ensure we have proper transformation parameters

        // Remove any existing variant/parameters from the URL
        const baseUrlMatch = currentImage.url.match(
          /^(https:\/\/imagedelivery\.net\/[^\/]+\/[^\/]+)/
        );
        if (baseUrlMatch) {
          const baseUrl = baseUrlMatch[1];

          if (useHighestQuality) {
            // High quality: max 5000px width, 100% quality
            urlToCopy = `${baseUrl}/w=5000,q=100`;
          } else {
            // Standard quality: reasonable defaults (1200px width, 85% quality)
            urlToCopy = `${baseUrl}/w=1200,q=85`;
          }
        } else {
          // Fallback: if URL doesn't match expected pattern, just use original
          urlToCopy = currentImage.url;
        }
      }

      navigator.clipboard
        .writeText(urlToCopy)
        .then(() => {
          toast({
            title: useHighestQuality
              ? "Highest Quality URL Copied!"
              : "Image URL Copied!",
            description: useHighestQuality
              ? "Maximum resolution image URL copied to clipboard"
              : "Standard image URL copied to clipboard",
            duration: 2000,
          });
        })
        .catch(() => {
          toast({
            title: "Copy Failed",
            description: "Failed to copy URL to clipboard",
            variant: "destructive",
            duration: 2000,
          });
        });
    },
    [currentImage, toast]
  );

  // Keyboard navigation handler
  const handleKeyboardNavigation = useCallback(
    (event: KeyboardEvent) => {
      // Ignore keyboard events when typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const isShiftPressed = event.shiftKey;
      const isCtrlPressed = event.ctrlKey || event.metaKey; // Support both Ctrl and Cmd
      const key = event.key;

      // Handle Ctrl/Cmd + Key combinations
      if (isCtrlPressed) {
        switch (key.toLowerCase()) {
          case "a":
            event.preventDefault();
            // Select all images in edit mode
            if (isEditMode && filteredImages.length > 0) {
              handleSelectAll();
            }
            break;
        }
        return;
      }

      // Handle Shift + Key combinations
      if (isShiftPressed) {
        switch (key.toLowerCase()) {
          case "f":
            event.preventDefault();
            // Toggle fullscreen lightbox
            setIsModalOpen(!isModalOpen);
            break;

          case "i":
            event.preventDefault();
            // Toggle image info
            setShowImageInfo(!showImageInfo);
            break;

          case "c":
            event.preventDefault();
            if (!currentImage) return;

            // Double copy detection for highest quality
            const now = Date.now();
            const timeSinceLastCopy = now - lastCopyTimeRef.current;

            if (timeSinceLastCopy < 1000) {
              // Less than 1 second = double press
              // Clear any existing timeout
              if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
                copyTimeoutRef.current = null;
              }
              // Copy highest quality URL
              copyImageUrl(true);
              lastCopyTimeRef.current = 0; // Reset to prevent triple-click issues
            } else {
              // Single press - set timeout to copy standard URL
              lastCopyTimeRef.current = now;
              copyTimeoutRef.current = setTimeout(() => {
                copyImageUrl(false);
                copyTimeoutRef.current = null;
              }, 300); // Wait 300ms to see if there's a second press
            }
            break;

          case "arrowleft":
            event.preventDefault();
            // Navigate to previous page
            if (currentPage > 0) {
              setCurrentPage(currentPage - 1);
            }
            break;

          case "arrowright":
            event.preventDefault();
            // Navigate to next page
            const totalPages =
              serverPagination?.totalPages ||
              Math.ceil(
                filteredImages.length / (serverPagination?.itemsPerPage || 20)
              );
            if (currentPage < totalPages - 1) {
              setCurrentPage(currentPage + 1);
            }
            break;

          case "e":
            event.preventDefault();
            // Toggle edit mode
            toggleEditMode();
            break;
        }
        return;
      }

      // Handle non-modifier key combinations
      switch (key) {
        case "ArrowLeft":
          event.preventDefault();
          handlePrev();
          break;

        case "ArrowRight":
          event.preventDefault();
          handleNext();
          break;

        case "Escape":
          event.preventDefault();
          if (isModalOpen) {
            setIsModalOpen(false);
          } else if (isEditMode && selectedImages.size > 0) {
            // Clear selection in edit mode when Escape is pressed
            handleSelectNone();
          }
          break;

        case "Delete":
        case "Backspace":
          event.preventDefault();
          // Trigger batch delete when images are selected in edit mode
          if (isEditMode && selectedImages.size > 0) {
            handleDeleteSelected();
          }
          break;
      }
    },
    [
      isModalOpen,
      showImageInfo,
      currentImage,
      handleNext,
      handlePrev,
      setIsModalOpen,
      setShowImageInfo,
      copyImageUrl,
      currentPage,
      serverPagination,
      setCurrentPage,
      filteredImages,
      isEditMode,
      selectedImages.size,
      handleSelectAll,
      handleSelectNone,
      handleDeleteSelected,
      toggleEditMode,
    ]
  );

  // Set up keyboard event listeners
  useEffect(() => {
    document.addEventListener("keydown", handleKeyboardNavigation);

    return () => {
      document.removeEventListener("keydown", handleKeyboardNavigation);

      // Cleanup copy timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, [handleKeyboardNavigation]);

  useEffect(() => {
    // Only log essential information when data changes
  }, [carId, images.length]);

  // Clear filters handler
  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, [setFilters]);

  // Clear search handler
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, [setSearchQuery]);

  // Check if we have active filters or search
  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== ""
  );
  const hasActiveSearch = searchQuery.trim() !== "";

  // CRITICAL FIX: Only show "no results found" when we have EXPLICIT filters/search with no results
  // This prevents any flash during initial load or filtering calculation
  const hasExplicitFilters =
    hasActiveFilters &&
    Object.entries(filters).some(([key, value]) => value && value !== "all");
  const hasExplicitSearch = hasActiveSearch && searchQuery.trim().length > 0;
  const shouldShowNoResults = hasExplicitFilters || hasExplicitSearch;

  // IMPROVED: Comprehensive loading check to prevent infinite loading states
  // Show loading when:
  // 1. Explicitly loading (isLoading) AND initial load is not complete yet
  // 2. Initial load not complete AND we don't have error state
  // The key fix: Don't rely on vehicleInfo.imageIds as it might be stale
  if ((isLoading && isInitialLoad) || (isInitialLoad && !error)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading gallery...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-destructive">
        Error loading images:{" "}
        {typeof error === "string" ? error : error.message || "Unknown error"}
      </div>
    );
  }

  // FIXED: Better empty state logic - only after loading is complete
  const isTrulyEmpty = !hasImages && images.length === 0;
  const hasFilteredResults = filteredImages.length > 0;
  const hasActiveFiltersOrSearch = hasActiveFilters || hasActiveSearch;

  // Show upload dialog only when truly empty AND no active filters/search AND loading is complete
  if (
    isTrulyEmpty &&
    !hasActiveFiltersOrSearch &&
    !isLoading &&
    !isInitialLoad
  ) {
    return (
      <UploadDialog
        isOpen={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        carId={carId}
        vehicleInfo={vehicleInfo}
        onComplete={handleUploadComplete}
        showAsEmptyState={true}
      />
    );
  }

  // Normal gallery view when we have filtered results
  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <ImageFilters
              filters={filters}
              searchQuery={searchQuery}
              filterOptions={filterOptions}
              onFiltersChange={setFilters}
              onSearchChange={setSearchQuery}
              onUploadClick={() => setIsUploadDialogOpen(true)}
            />
          </div>
          <div className="flex-shrink-0">
            <EditModeToggle isEditMode={isEditMode} />
          </div>
        </div>
      )}

      {/* Upload button when filters are hidden */}
      {!showFilters && (
        <div className="flex items-center justify-end gap-2">
          <EditModeToggle isEditMode={isEditMode} />
          <UploadDialog
            isOpen={isUploadDialogOpen}
            onOpenChange={setIsUploadDialogOpen}
            carId={carId}
            vehicleInfo={vehicleInfo}
            onComplete={handleUploadComplete}
            showAsButton={true}
          />
        </div>
      )}

      {/* Main Gallery Layout */}
      <div className="flex gap-6 h-[calc(100vh-350px)] min-h-[500px]">
        {/* Main Image Viewer - responsive width - only render when we have content */}
        {currentImage && filteredImages.length > 0 ? (
          <div className="flex-1 min-w-0 lg:w-2/3">
            <ImageViewer
              currentImage={currentImage}
              onNext={handleNext}
              onPrev={handlePrev}
              onOpenModal={() => setIsModalOpen(true)}
              onToggleInfo={() => setShowImageInfo(!showImageInfo)}
              showImageInfo={showImageInfo}
              onReanalyze={reanalyzeImage}
            />
          </div>
        ) : (
          <div className="flex-1 min-w-0 lg:w-2/3 bg-background rounded-lg" />
        )}

        {/* Thumbnails - responsive width */}
        <div className="w-full lg:w-1/3 lg:max-w-[400px] min-w-[280px]">
          <ImageThumbnails
            images={filteredImages}
            currentImage={currentImage}
            selectedImages={selectedImages}
            currentPage={currentPage}
            isEditMode={isEditMode}
            showImageInfo={showImageInfo}
            isLoadingMore={isLoadingMore}
            isNavigating={isNavigating}
            totalImagesAvailable={totalImagesAvailable}
            filters={filters}
            searchQuery={searchQuery}
            onImageSelect={setMainImage}
            onToggleSelection={toggleImageSelection}
            onPageChange={setCurrentPage}
            onToggleInfo={setShowImageInfo}
            onReanalyze={reanalyzeImage}
            onSetPrimary={handleSetPrimaryImage}
            onLoadMore={loadMoreImages}
            onDeleteSingle={handleDeleteSingle}
            onSelectAll={handleSelectAll}
            onSelectNone={handleSelectNone}
            onDeleteSelected={handleDeleteSelected}
            serverPagination={serverPagination}
          />
        </div>
      </div>

      {/* Enhanced Full Screen Modal with navigation */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentImage={currentImage}
        images={filteredImages}
        onNext={handleNext}
        onPrev={handlePrev}
        showImageInfo={showImageInfo}
        onToggleInfo={() => setShowImageInfo(!showImageInfo)}
        onCopyUrl={copyImageUrl}
      />

      {/* Upload Dialog */}
      <UploadDialog
        isOpen={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        carId={carId}
        vehicleInfo={vehicleInfo}
        onComplete={handleUploadComplete}
      />
    </div>
  );
}
