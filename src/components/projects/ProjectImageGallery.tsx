"use client";

import React, { useEffect, useCallback, useRef, useMemo } from "react";
import { useProjectImageGallery } from "@/hooks/useProjectImageGallery";
import { ImageFilters } from "../cars/gallery/ImageFilters";
import { ImageViewer } from "../cars/gallery/ImageViewer";
import { ImageThumbnails } from "../cars/gallery/ImageThumbnails";
import { ImageModal } from "../cars/gallery/ImageModal";
import EditModeToggle from "../cars/EditModeToggle";
import { useToast } from "@/components/ui/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { Project } from "@/types/project";
import { ProjectUploadDialog } from "./ProjectUploadDialog";
import { BatchDeleteConfirmDialog } from "./BatchDeleteConfirmDialog";

interface ProjectImageGalleryProps {
  projectId: string;
  showFilters?: boolean;
  projectInfo?: Project;
  onFilterOptionsChange?: (options: Record<string, string[]>) => void;
  onUploadStarted?: () => void;
  onUploadEnded?: () => void;
}

export function ProjectImageGallery({
  projectId,
  showFilters = true,
  projectInfo,
  onFilterOptionsChange,
  onUploadStarted,
  onUploadEnded,
}: ProjectImageGalleryProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastCopyTimeRef = useRef<number>(0);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-determine if this project has images to show appropriate loading state
  const hasImages = useMemo(() => {
    // For now, assume projects can have images - we'll determine this from the API response
    return false;
  }, []);

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
    confirmDeleteSelected,
    cancelDelete,
    handleClearSelection,
    handleSelectAll,
    handleSelectNone,
    reanalyzeImage,
    handleSetPrimaryImage,
    loadMoreImages,

    // Delete confirmation state
    showDeleteConfirm,
    deleteTargetImages,
    isDeletingImages,
  } = useProjectImageGallery(projectId, projectInfo);

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
        const baseUrlMatch = currentImage.url.match(
          /^(https:\/\/imagedelivery\.net\/[^\/]+\/[^\/]+)/
        );
        if (baseUrlMatch) {
          const baseUrl = baseUrlMatch[1];

          if (useHighestQuality) {
            urlToCopy = `${baseUrl}/w=5000,q=100`;
          } else {
            urlToCopy = `${baseUrl}/w=1200,q=85`;
          }
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

          case "ArrowLeft":
            event.preventDefault();
            console.log("🔄 [SHIFT+ARROW] Left arrow pressed", {
              currentPage: currentPage + 1,
              canGoPrev: currentPage > 0,
              serverPagination,
            });
            // Navigate to previous page
            if (currentPage > 0) {
              // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 [SHIFT+ARROW] Going to previous page");
              setCurrentPage(currentPage - 1);
            } else {
              // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 [SHIFT+ARROW] Already on first page");
            }
            break;

          case "ArrowRight":
            event.preventDefault();
            const totalPages = serverPagination?.totalPages || 0;
            console.log("🔄 [SHIFT+ARROW] Right arrow pressed", {
              currentPage: currentPage + 1,
              totalPages,
              canGoNext: currentPage < totalPages - 1,
              serverPagination,
            });
            // Navigate to next page
            if (currentPage < totalPages - 1) {
              // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 [SHIFT+ARROW] Going to next page");
              setCurrentPage(currentPage + 1);
            } else {
              console.log(
                "🔄 [SHIFT+ARROW] Already on last page or no pages available"
              );
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

  const isAuthError = error?.message === "Authentication required";
  if (
    (isLoading && isInitialLoad) ||
    (isInitialLoad && !error) ||
    isAuthError
  ) {
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

  // Empty state
  const isTrulyEmpty = !hasImages && images.length === 0;
  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== ""
  );
  const hasActiveSearch = searchQuery.trim() !== "";
  const hasActiveFiltersOrSearch = hasActiveFilters || hasActiveSearch;

  if (
    isTrulyEmpty &&
    !hasActiveFiltersOrSearch &&
    !isLoading &&
    !isInitialLoad
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Upload className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg font-medium">No images yet</p>
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Images
        </Button>
        <ProjectUploadDialog
          isOpen={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
          projectId={projectId}
          projectInfo={projectInfo}
          onComplete={handleUploadComplete}
        />
      </div>
    );
  }

  // Normal gallery view
  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <ImageFilters
              filters={filters}
              searchQuery={searchQuery}
              filterOptions={{
                angles: filterOptions.angle || [],
                views: filterOptions.view || [],
                movements: filterOptions.movement || [],
                tods: filterOptions.tod || [],
                sides: filterOptions.side || [],
              }}
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
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Upload Images
          </Button>
        </div>
      )}

      {/* Main Gallery Layout */}
      <div className="flex gap-6 h-[calc(100vh-350px)] min-h-[500px]">
        {/* Main Image Viewer */}
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

        {/* Thumbnails */}
        <div className="w-full lg:w-1/3 lg:max-w-[400px] min-w-[280px]">
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
              const image = filteredImages.find(
                (img: any) => img._id === imageId
              );
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

      {/* Full Screen Modal */}
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
      <ProjectUploadDialog
        isOpen={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        projectId={projectId}
        projectInfo={projectInfo}
        onComplete={handleUploadComplete}
      />

      {/* Batch Delete Confirmation Dialog */}
      <BatchDeleteConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={cancelDelete}
        onConfirm={confirmDeleteSelected}
        imageCount={deleteTargetImages.length}
        isDeleting={isDeletingImages}
      />
    </div>
  );
}
