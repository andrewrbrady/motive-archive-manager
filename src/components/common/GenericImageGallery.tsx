"use client";

import React, { useEffect, useCallback, useRef, useMemo } from "react";
import { useGenericImageGallery } from "@/hooks/useGenericImageGallery";
import { ImageFilters } from "../cars/gallery/ImageFilters";
import { ImageViewer } from "../cars/gallery/ImageViewer";
import { ImageThumbnails } from "../cars/gallery/ImageThumbnails";
import { ImageModal } from "../cars/gallery/ImageModal";
import { UploadDialog } from "../cars/gallery/UploadDialog";
import { ProjectUploadDialog } from "../projects/ProjectUploadDialog";
import EditModeToggle from "../cars/EditModeToggle";
import { NoResultsFound } from "../cars/gallery/NoResultsFound";
import { useToast } from "@/components/ui/use-toast";
import { useRouter, useSearchParams } from "next/navigation";

interface GenericImageGalleryProps {
  entityId: string;
  entityType: "car" | "project";
  showFilters?: boolean;
  entityInfo?: any;
  onFilterOptionsChange?: (options: Record<string, string[]>) => void;
  onUploadStarted?: () => void;
  onUploadEnded?: () => void;
}

export function GenericImageGallery({
  entityId,
  entityType,
  showFilters = true,
  entityInfo,
  onFilterOptionsChange,
  onUploadStarted,
  onUploadEnded,
}: GenericImageGalleryProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastCopyTimeRef = useRef<number>(0);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-determine if this entity has images to show appropriate loading state
  const hasImages = useMemo(() => {
    const imageIds = entityInfo?.imageIds?.length || 0;
    const processedImageIds = entityInfo?.processedImageIds?.length || 0;
    return imageIds > 0 || processedImageIds > 0;
  }, [entityInfo?.imageIds, entityInfo?.processedImageIds]);

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
  } = useGenericImageGallery({ entityId, entityType, entityInfo });

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
            // Navigate to previous page while preserving image position
            if (currentPage > 0) {
              navigateToPageWithPosition(currentPage - 1);
            }
            break;

          case "arrowright":
            event.preventDefault();
            // Navigate to next page while preserving image position
            const totalPages =
              serverPagination?.totalPages ||
              Math.ceil(
                filteredImages.length / (serverPagination?.itemsPerPage || 15)
              );
            if (currentPage < totalPages - 1) {
              navigateToPageWithPosition(currentPage + 1);
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

      // Handle regular navigation keys
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
      isEditMode,
      filteredImages.length,
      handleSelectAll,
      isModalOpen,
      setIsModalOpen,
      showImageInfo,
      setShowImageInfo,
      currentImage,
      copyImageUrl,
      currentPage,
      serverPagination,
      setCurrentPage,
      navigateToPageWithPosition,
      toggleEditMode,
      handlePrev,
      handleNext,
      selectedImages.size,
      handleSelectNone,
      handleDeleteSelected,
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
  }, [entityId, images.length]);

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

  // FIXED: Comprehensive loading check to prevent infinite loading states
  // Show loading when:
  // 1. Explicitly loading (isLoading) - the API call is in progress
  // 2. Authentication error - show loading instead of error until auth is ready
  // REMOVED: (isInitialLoad && !error) - this was causing infinite loading
  const isAuthError = error?.message === "Authentication required";
  if (isLoading || isAuthError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            {isAuthError ? "Authenticating..." : "Loading gallery..."}
          </p>
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
    return entityType === "car" ? (
      <UploadDialog
        isOpen={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        carId={entityId}
        vehicleInfo={entityInfo}
        onComplete={handleUploadComplete}
        showAsEmptyState={true}
      />
    ) : (
      <ProjectUploadDialog
        isOpen={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        projectId={entityId}
        projectInfo={entityInfo}
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
          {entityType === "car" ? (
            <UploadDialog
              isOpen={isUploadDialogOpen}
              onOpenChange={setIsUploadDialogOpen}
              carId={entityId}
              vehicleInfo={entityInfo}
              onComplete={handleUploadComplete}
              showAsButton={true}
            />
          ) : (
            <ProjectUploadDialog
              isOpen={isUploadDialogOpen}
              onOpenChange={setIsUploadDialogOpen}
              projectId={entityId}
              projectInfo={entityInfo}
              onComplete={handleUploadComplete}
              showAsButton={true}
            />
          )}
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
        <div className="w-full lg:w-1/3 lg:max-w-[460px] min-w-[280px]">
          <ImageThumbnails
            images={filteredImages}
            currentImage={currentImage || undefined}
            selectedImages={selectedImages}
            currentPage={currentPage}
            isEditMode={isEditMode}
            showImageInfo={showImageInfo}
            isLoadingMore={isLoadingMore}
            isNavigating={isNavigating}
            totalImagesAvailable={totalImagesAvailable}
            filters={filters}
            searchQuery={searchQuery}
            onImageSelect={(imageId: string) => {
              const image = filteredImages.find((img) => img._id === imageId);
              if (image) setMainImage(image);
            }}
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
        currentImage={currentImage || undefined}
        images={filteredImages}
        onNext={handleNext}
        onPrev={handlePrev}
        showImageInfo={showImageInfo}
        onToggleInfo={() => setShowImageInfo(!showImageInfo)}
        onCopyUrl={copyImageUrl}
      />

      {/* Upload Dialog */}
      {entityType === "car" ? (
        <UploadDialog
          isOpen={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
          carId={entityId}
          vehicleInfo={entityInfo}
          onComplete={handleUploadComplete}
        />
      ) : (
        <ProjectUploadDialog
          isOpen={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
          projectId={entityId}
          projectInfo={entityInfo}
          onComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
