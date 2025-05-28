"use client";

import React from "react";
import { useImageGallery } from "@/hooks/useImageGallery";
import { ImageFilters } from "./gallery/ImageFilters";
import { ImageViewer } from "./gallery/ImageViewer";
import { ImageThumbnails } from "./gallery/ImageThumbnails";
import { ImageModal } from "./gallery/ImageModal";
import { UploadDialog } from "./gallery/UploadDialog";
import { EditModeControls } from "./gallery/EditModeControls";
import { Loader2 } from "lucide-react";

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
  showFilters = false,
  vehicleInfo,
  onFilterOptionsChange,
  onUploadStarted,
  onUploadEnded,
}: CarImageGalleryProps) {
  const {
    // Data
    images,
    filteredImages,
    currentImage,
    filterOptions,
    isLoading,
    error,

    // State
    filters,
    searchQuery,
    selectedImages,
    currentPage,
    isModalOpen,
    isUploadDialogOpen,
    showImageInfo,
    isEditMode,

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
    reanalyzeImage,
  } = useImageGallery(carId, vehicleInfo);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-destructive">
        Error loading images: {error.message || error}
      </div>
    );
  }

  // Empty state
  if (images.length === 0) {
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <ImageFilters
          filters={filters}
          searchQuery={searchQuery}
          filterOptions={filterOptions}
          onFiltersChange={setFilters}
          onSearchChange={setSearchQuery}
          onUploadClick={() => setIsUploadDialogOpen(true)}
        />
      )}

      {/* Upload button when filters are hidden */}
      {!showFilters && (
        <div className="flex items-center justify-end">
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

      {/* Edit Mode Controls */}
      {isEditMode && selectedImages.size > 0 && (
        <EditModeControls
          selectedCount={selectedImages.size}
          onDelete={handleDeleteSelected}
        />
      )}

      {/* Main Gallery Layout */}
      <div className="flex gap-6">
        {/* Main Image Viewer - 2/3 width */}
        <div className="w-2/3">
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

        {/* Thumbnails - 1/3 width */}
        <div className="w-1/3">
          <ImageThumbnails
            images={filteredImages}
            currentImage={currentImage}
            selectedImages={selectedImages}
            currentPage={currentPage}
            isEditMode={isEditMode}
            showImageInfo={showImageInfo}
            onImageSelect={setMainImage}
            onToggleSelection={toggleImageSelection}
            onPageChange={setCurrentPage}
            onToggleInfo={setShowImageInfo}
            onReanalyze={reanalyzeImage}
          />
        </div>
      </div>

      {/* Full Screen Modal */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentImage={currentImage}
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
