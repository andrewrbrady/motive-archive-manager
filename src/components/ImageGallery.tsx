"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Loader2,
  Check,
  Compass,
  Eye,
  Sun,
  Move,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageFilterControls } from "./ImageFilterControls";
import { UploadProgressDialog } from "./UploadProgressDialog";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  error?: string;
  currentStep?: string;
}

interface ImageGalleryProps {
  images: {
    id: string;
    url: string;
    filename: string;
    metadata: {
      angle?: string;
      description?: string;
      movement?: string;
      tod?: string;
      view?: string;
      side?: string;
    };
    variants?: {
      [key: string]: string;
    };
    createdAt: string;
    updatedAt: string;
  }[];
  title?: string;
  aspectRatio?: string;
  thumbnailsPerRow?: number;
  rowsPerPage?: number;
  isEditMode?: boolean;
  onRemoveImage?: (indices: number[]) => void;
  onImagesChange?: (files: FileList) => void;
  uploading?: boolean;
  uploadProgress?: UploadProgress[];
  _setUploadProgress?: (progress: UploadProgress[]) => void;
  showMetadata?: boolean;
  showFilters?: boolean;
  _vehicleInfo?: {
    year: number;
    make: string;
    model: string;
    type?: string;
  };
}

const MetadataSection = ({
  metadata,
  currentIndex,
}: {
  metadata: ImageGalleryProps["images"];
  currentIndex: number;
}) => {
  if (!metadata.length || !metadata[currentIndex]) return null;

  const currentMetadata = metadata[currentIndex].metadata;

  return (
    <div className="bg-white rounded-lg shadow p-3">
      <div className="grid grid-cols-4 divide-x divide-gray-200">
        {currentMetadata.angle && (
          <div className="flex items-center px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500 uppercase text-xs font-medium">
                Angle
              </span>
            </div>
            <span className="uppercase text-xs ml-auto">
              {currentMetadata.angle}
            </span>
          </div>
        )}
        {currentMetadata.view && (
          <div className="flex items-center px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500 uppercase text-xs font-medium">
                View
              </span>
            </div>
            <span className="uppercase text-xs ml-auto">
              {currentMetadata.view}
            </span>
          </div>
        )}
        {currentMetadata.tod && (
          <div className="flex items-center px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500 uppercase text-xs font-medium">
                Time of Day
              </span>
            </div>
            <span className="uppercase text-xs ml-auto">
              {currentMetadata.tod}
            </span>
          </div>
        )}
        {currentMetadata.movement && (
          <div className="flex items-center px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500 uppercase text-xs font-medium">
                Movement
              </span>
            </div>
            <span className="uppercase text-xs ml-auto">
              {currentMetadata.movement}
            </span>
          </div>
        )}
      </div>
      {currentMetadata.description && (
        <div className="mt-2 text-gray-600 border-t pt-2">
          {currentMetadata.description}
        </div>
      )}
    </div>
  );
};

const ImageSkeleton = ({ aspectRatio = "4/3" }: { aspectRatio?: string }) => (
  <div
    className="animate-pulse bg-gray-200 rounded-lg relative w-full"
    style={{ aspectRatio }}
  />
);

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  title,
  aspectRatio = "4/3",
  thumbnailsPerRow = 8,
  rowsPerPage = 3,
  isEditMode = false,
  onRemoveImage,
  onImagesChange,
  uploading = false,
  uploadProgress = [],
  _setUploadProgress,
  showMetadata = true,
  showFilters = true,
  _vehicleInfo,
}) => {
  const [mainIndex, setMainIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMainVisible, setIsMainVisible] = useState(true);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [filters, setFilters] = useState<{
    angle?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
  }>({});
  const mainImageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const [hasSetInitialImage, setHasSetInitialImage] = useState(false);
  const prevImagesLengthRef = useRef(images.length);
  const _prevMainIndexRef = useRef(mainIndex);

  // Handle initial image load and updates
  useEffect(() => {
    if (images.length > 0 && !hasSetInitialImage) {
      const timer = setTimeout(() => {
        setMainIndex(0);
        setMainImageLoaded(false);
        setHasSetInitialImage(true);
      }, 50);
      return () => clearTimeout(timer);
    }
    // Reset states when there are no images
    else if (images.length === 0) {
      setMainIndex(0);
      setMainImageLoaded(false);
      setHasSetInitialImage(false);
    }
    prevImagesLengthRef.current = images.length;
  }, [images.length, hasSetInitialImage]);

  // Only force reload when entering/exiting edit mode
  useEffect(() => {
    if (isEditMode) {
      setCurrentPage(1);
      setSelectedImages([]);
      setFilters({});
    }
  }, [isEditMode]);

  const itemsPerPage = thumbnailsPerRow * rowsPerPage;

  // Extract available filter values from images
  const availableFilters = images.reduce(
    (acc, image) => {
      if (image.metadata.angle && !acc.angles.includes(image.metadata.angle)) {
        acc.angles.push(image.metadata.angle);
      }
      if (
        image.metadata.movement &&
        !acc.movements.includes(image.metadata.movement)
      ) {
        acc.movements.push(image.metadata.movement);
      }
      if (image.metadata.tod && !acc.tods.includes(image.metadata.tod)) {
        acc.tods.push(image.metadata.tod);
      }
      if (image.metadata.view && !acc.views.includes(image.metadata.view)) {
        acc.views.push(image.metadata.view);
      }
      if (image.metadata.side && !acc.sides.includes(image.metadata.side)) {
        acc.sides.push(image.metadata.side);
      }
      return acc;
    },
    {
      angles: [] as string[],
      movements: [] as string[],
      tods: [] as string[],
      views: [] as string[],
      sides: [] as string[],
    }
  );

  // Sort filter values alphabetically
  Object.keys(availableFilters).forEach((key) => {
    availableFilters[key as keyof typeof availableFilters].sort();
  });

  // Filter images based on selected filters
  const filteredImages = images.filter((image) => {
    const result = Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const imageValue = image.metadata[key as keyof typeof image.metadata];
      const matches = imageValue === value;
      console.log(`Filtering image ${image.filename}:`, {
        filterKey: key,
        filterValue: value,
        imageValue,
        matches,
      });
      return matches;
    });
    return result;
  });

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);

  // Log filter state changes
  useEffect(() => {
    console.log("Filter state changed:", {
      activeFilters: filters,
      totalImages: images.length,
      filteredCount: filteredImages.length,
    });
  }, [filters, images.length, filteredImages.length]);

  // Reset mainIndex and currentPage when filtered results change
  useEffect(() => {
    if (filteredImages.length === 0) {
      setMainIndex(0);
      setCurrentPage(1);
    } else if (mainIndex >= filteredImages.length) {
      setMainIndex(filteredImages.length - 1);
      const newPage = Math.ceil(filteredImages.length / itemsPerPage);
      setCurrentPage(Math.min(currentPage, newPage));
    }
  }, [filteredImages.length, mainIndex, currentPage, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      const firstImageIndexOfNewPage = (newPage - 1) * itemsPerPage;
      setMainIndex(
        Math.min(firstImageIndexOfNewPage, filteredImages.length - 1)
      );
      setMainImageLoaded(true);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMainVisible(entry.isIntersecting);
      },
      { threshold: 0.5 }
    );

    if (mainImageRef.current) {
      observer.observe(mainImageRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const selectedImagePage = Math.ceil((mainIndex + 1) / itemsPerPage);
    if (selectedImagePage !== currentPage) {
      setCurrentPage(selectedImagePage);
    }
  }, [mainIndex, itemsPerPage, currentPage]);

  const handleNext = useCallback(() => {
    if (isModalOpen) {
      setModalIndex((prev) => (prev + 1) % filteredImages.length);
    } else {
      setMainIndex((prev) => (prev + 1) % filteredImages.length);
    }
  }, [isModalOpen, filteredImages.length]);

  const handlePrev = useCallback(() => {
    if (isModalOpen) {
      setModalIndex(
        (prev) => (prev - 1 + filteredImages.length) % filteredImages.length
      );
    } else {
      setMainIndex(
        (prev) => (prev - 1 + filteredImages.length) % filteredImages.length
      );
    }
  }, [isModalOpen, filteredImages.length]);

  const handleDeleteSelected = useCallback(() => {
    if (onRemoveImage) {
      onRemoveImage(selectedImages);
      setSelectedImages([]);
    }
  }, [onRemoveImage, selectedImages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Shift + Arrow combinations first
      if (e.shiftKey) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          handlePageChange(Math.max(1, currentPage - 1));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          handlePageChange(Math.min(totalPages, currentPage + 1));
        } else if (
          e.key === "Delete" &&
          isEditMode &&
          selectedImages.length > 0
        ) {
          e.preventDefault();
          handleDeleteSelected();
        }
        return;
      }

      // Handle regular arrow keys
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleNext,
    handlePrev,
    isModalOpen,
    currentPage,
    totalPages,
    handlePageChange,
    isEditMode,
    selectedImages.length,
    handleDeleteSelected,
  ]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onImagesChange) {
      onImagesChange(e.target.files);
    }
  };

  const handleImageSelect = (index: number, event: React.MouseEvent) => {
    if (!isEditMode) return;
    event.preventDefault();
    event.stopPropagation();

    setSelectedImages((prev) => {
      const isSelected = prev.includes(index);
      if (isSelected) {
        return prev.filter((i) => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  // Remove the mainImageLoaded state changes from thumbnail clicks
  const handleThumbnailClick = (index: number) => {
    if (!isEditMode) {
      setMainIndex(index);
    }
  };

  if (!images || images.length === 0 || filteredImages.length === 0) {
    return (
      <>
        <div className="flex gap-6">
          <div className="w-2/3 space-y-3">
            <div className="w-full aspect-[4/3] relative bg-gray-100 rounded-lg">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-gray-400">
                  {!images || images.length === 0
                    ? "No images available"
                    : "No images match the selected filters"}
                </span>
              </div>
            </div>
          </div>

          <div className="w-1/3">
            {isEditMode && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept="image/*"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 w-full justify-center"
                  >
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {uploading ? "Uploading..." : "Add Images"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Always show upload progress dialog */}
        <UploadProgressDialog
          isOpen={uploadProgress.length > 0}
          uploadProgress={uploadProgress}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <ImageFilterControls
          filters={filters}
          onFilterChange={setFilters}
          availableFilters={availableFilters}
        />
      )}
      <div className="flex gap-6">
        <div className="w-2/3 space-y-3">
          <div
            ref={mainImageRef}
            className={`sticky top-4 mb-4 transition-opacity duration-300 ${
              isMainVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-100"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {filteredImages[mainIndex] && (
                <>
                  {!mainImageLoaded && (
                    <ImageSkeleton aspectRatio={aspectRatio} />
                  )}
                  <img
                    key={`${filteredImages[mainIndex].id}-${isEditMode}`}
                    src={`${filteredImages[mainIndex].url}/public`}
                    alt={
                      title
                        ? `${title} - View ${mainIndex + 1}`
                        : `View ${mainIndex + 1} of ${filteredImages.length}`
                    }
                    className={cn(
                      "w-full h-full object-cover transition-opacity duration-300",
                      !mainImageLoaded && "opacity-0"
                    )}
                    onLoad={() => {
                      // Only set loaded state on first load
                      if (!mainImageLoaded) {
                        setMainImageLoaded(true);
                      }
                    }}
                  />
                </>
              )}
              <button
                onClick={() => {
                  setModalIndex(mainIndex);
                  setIsModalOpen(true);
                }}
                className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                aria-label="Open fullscreen view"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showMetadata && filteredImages[mainIndex] && (
            <div className="mt-4">
              <MetadataSection
                metadata={filteredImages}
                currentIndex={mainIndex}
              />
            </div>
          )}
        </div>

        <div className="w-1/3 space-y-4">
          {isEditMode && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const currentPageImages = filteredImages
                      .slice(
                        (currentPage - 1) * itemsPerPage,
                        currentPage * itemsPerPage
                      )
                      .map(
                        (_, index) => (currentPage - 1) * itemsPerPage + index
                      );

                    const allSelected = currentPageImages.every((index) =>
                      selectedImages.includes(index)
                    );

                    if (allSelected) {
                      setSelectedImages((prev) =>
                        prev.filter(
                          (index) => !currentPageImages.includes(index)
                        )
                      );
                    } else {
                      setSelectedImages((prev) => [
                        ...new Set([...prev, ...currentPageImages]),
                      ]);
                    }
                  }}
                  className="px-3 py-1.5 border rounded-md hover:bg-gray-50 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {selectedImages.length === filteredImages.length
                    ? "Deselect All"
                    : "Select All on Page"}
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedImages.length === 0}
                  className={`px-3 py-1.5 border rounded-md hover:bg-gray-50 flex items-center gap-2 w-full ${
                    selectedImages.length > 0
                      ? "border-red-200 text-red-600"
                      : "border-gray-200 text-gray-400"
                  }`}
                >
                  <X className="w-4 h-4" />
                  Delete Selected ({selectedImages.length})
                  {selectedImages.length > 0 && (
                    <span className="text-xs text-gray-500 ml-auto">
                      Shift + Delete
                    </span>
                  )}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                  accept="image/*"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 w-full justify-center"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploading ? "Uploading..." : "Add Images"}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {filteredImages
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              )
              .map((image, index) => {
                const actualIndex = (currentPage - 1) * itemsPerPage + index;
                const isSelected = selectedImages.includes(actualIndex);

                return (
                  <div
                    key={index}
                    className="relative group cursor-pointer"
                    onClick={() => {
                      if (!isEditMode) {
                        handleThumbnailClick(actualIndex);
                      }
                    }}
                    style={{ aspectRatio }}
                  >
                    <img
                      src={`${image.url}/public`}
                      alt={`Image ${actualIndex + 1}`}
                      className={cn(
                        "w-full h-full object-cover rounded-lg transition-all duration-300",
                        isMainVisible && actualIndex === mainIndex
                          ? ""
                          : "opacity-75",
                        isSelected ? "opacity-75" : ""
                      )}
                    />
                    {isEditMode && (
                      <div
                        className="absolute top-2 right-2 z-10"
                        onClick={(e) => handleImageSelect(actualIndex, e)}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 ${
                            isSelected
                              ? "bg-blue-500 border-blue-500"
                              : "border-white"
                          } flex items-center justify-center`}
                        >
                          {isSelected && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 disabled:opacity-50"
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
        >
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 p-2 text-white"
            aria-label="Close fullscreen view"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={`${filteredImages[modalIndex].url}/public`}
            alt={`Full size view ${modalIndex + 1} of ${filteredImages.length}`}
            className="max-w-full max-h-[90vh] object-contain"
          />
          <button
            onClick={handlePrev}
            className="absolute left-4 p-2 text-white"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 p-2 text-white"
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}

      {/* Upload Progress */}
      <UploadProgressDialog
        isOpen={uploadProgress.length > 0}
        uploadProgress={uploadProgress}
      />
    </div>
  );
};

export default ImageGallery;
