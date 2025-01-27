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
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageFilterControls } from "./ImageFilterControls";
import { UploadProgressDialog } from "./UploadProgressDialog";
import { MotiveLogo } from "@/components/ui/MotiveLogo";

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
    <div className="bg-white dark:bg-black/25 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-3">
      <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-800">
        {currentMetadata.angle && (
          <div className="flex items-center px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
                Angle
              </span>
            </div>
            <span className="uppercase text-xs ml-auto text-gray-600 dark:text-gray-300">
              {currentMetadata.angle}
            </span>
          </div>
        )}
        {currentMetadata.view && (
          <div className="flex items-center px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
                View
              </span>
            </div>
            <span className="uppercase text-xs ml-auto text-gray-600 dark:text-gray-300">
              {currentMetadata.view}
            </span>
          </div>
        )}
        {currentMetadata.tod && (
          <div className="flex items-center px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
                Time of Day
              </span>
            </div>
            <span className="uppercase text-xs ml-auto text-gray-600 dark:text-gray-300">
              {currentMetadata.tod}
            </span>
          </div>
        )}
        {currentMetadata.movement && (
          <div className="flex items-center px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
                Movement
              </span>
            </div>
            <span className="uppercase text-xs ml-auto text-gray-600 dark:text-gray-300">
              {currentMetadata.movement}
            </span>
          </div>
        )}
      </div>
      {currentMetadata.description && (
        <div className="mt-2 text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-800 pt-2">
          {currentMetadata.description}
        </div>
      )}
    </div>
  );
};

const ImageSkeleton = ({ aspectRatio = "4/3" }: { aspectRatio?: string }) => (
  <div
    className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg relative w-full"
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
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Set initial image loaded state to true if we have images
  useEffect(() => {
    if (images.length > 0) {
      setMainImageLoaded(true);
    }
  }, []);

  // Handle initial image load and updates
  useEffect(() => {
    if (images.length > 0 && !hasSetInitialImage) {
      setMainIndex(0);
      setMainImageLoaded(true);
      setHasSetInitialImage(true);
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

  const handleDeleteAll = useCallback(async () => {
    if (onRemoveImage && images.length > 0) {
      try {
        setIsDeleting(true);
        await onRemoveImage(images.map((_, index) => index));
      } finally {
        setIsDeleting(false);
        setShowDeleteAllConfirm(false);
      }
    }
  }, [onRemoveImage, images.length]);

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
      } else if (e.key === "Escape") {
        if (isModalOpen) {
          setIsModalOpen(false);
        }
        // Only close delete confirmation if not currently deleting
        if (showDeleteAllConfirm && !isDeleting) {
          setShowDeleteAllConfirm(false);
        }
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
    showDeleteAllConfirm,
    isDeleting,
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
    const placeholderCount = 15; // 3x5 grid

    return (
      <div>
        <div className="flex gap-6">
          <div className="w-2/3">
            <div className="w-full aspect-[4/3] relative bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <MotiveLogo className="w-16 h-16 opacity-50" />
                <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wide text-sm font-medium">
                  {!images || images.length === 0
                    ? "No Images Available"
                    : "No Images Match The Selected Filters"}
                </span>
              </div>
            </div>
          </div>

          <div className="w-1/3 space-y-4">
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
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 disabled:opacity-50 flex items-center gap-2 w-full justify-center text-sm"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Add Images
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: placeholderCount }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[4/3] rounded-lg bg-neutral-100 dark:bg-neutral-800 relative group"
                >
                  {isEditMode && index === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-gray-400 dark:text-gray-500 text-sm">
                        Click "Add Images" to begin
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Always show upload progress dialog */}
        <UploadProgressDialog
          isOpen={uploadProgress.length > 0}
          uploadProgress={uploadProgress}
        />
      </div>
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
              className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900"
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
                className="absolute top-4 right-4 p-2 bg-black/50 dark:bg-white/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-white/20"
                aria-label="Open fullscreen view"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 dark:bg-white/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-white/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 dark:bg-white/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-white/20"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showMetadata && mainImageLoaded && (
            <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-3">
              <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-800">
                <div className="flex items-center px-4 first:pl-0 last:pr-0">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
                      Angle
                    </span>
                  </div>
                  <span className="uppercase text-xs ml-auto text-gray-600 dark:text-gray-300">
                    {filteredImages[mainIndex]?.metadata?.angle || "N/A"}
                  </span>
                </div>
                <div className="flex items-center px-4 first:pl-0 last:pr-0">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
                      View
                    </span>
                  </div>
                  <span className="uppercase text-xs ml-auto text-gray-600 dark:text-gray-300">
                    {filteredImages[mainIndex]?.metadata?.view || "N/A"}
                  </span>
                </div>
                <div className="flex items-center px-4 first:pl-0 last:pr-0">
                  <div className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
                      Time of Day
                    </span>
                  </div>
                  <span className="uppercase text-xs ml-auto text-gray-600 dark:text-gray-300">
                    {filteredImages[mainIndex]?.metadata?.tod || "N/A"}
                  </span>
                </div>
                <div className="flex items-center px-4 first:pl-0 last:pr-0">
                  <div className="flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-medium">
                      Movement
                    </span>
                  </div>
                  <span className="uppercase text-xs ml-auto text-gray-600 dark:text-gray-300">
                    {filteredImages[mainIndex]?.metadata?.movement || "N/A"}
                  </span>
                </div>
              </div>
              {filteredImages[mainIndex]?.metadata?.description && (
                <div className="mt-2 text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-800 pt-2">
                  {filteredImages[mainIndex].metadata.description}
                </div>
              )}
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
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 flex items-center gap-2 text-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Select All
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedImages.length === 0}
                  className={`px-3 py-1.5 border rounded-md flex items-center gap-2 text-sm ${
                    selectedImages.length > 0
                      ? "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-red-600 dark:hover:text-red-400"
                      : "border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600"
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  {selectedImages.length > 0 ? (
                    <>
                      Delete ({selectedImages.length})
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                        ⇧⌫
                      </span>
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 flex items-center gap-2 text-sm group ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5 group-hover:text-red-500 dark:group-hover:text-red-400" />
                  Delete All
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
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 disabled:opacity-50 flex items-center gap-2 w-full justify-center text-sm"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Add Images
                    </>
                  )}
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
                      src={`${image.url.replace("/public", "")}/width=200`}
                      alt={`Image ${actualIndex + 1}`}
                      className={cn(
                        "w-full h-full object-cover rounded-lg transition-all duration-300",
                        isMainVisible && actualIndex === mainIndex
                          ? ""
                          : "opacity-75 dark:opacity-60",
                        isSelected ? "opacity-75 dark:opacity-60" : ""
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
                              ? "bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600"
                              : "border-white dark:border-gray-300"
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
                className="p-2 bg-black/50 dark:bg-white/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-white/20 disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 bg-black/50 dark:bg-white/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-white/20 disabled:opacity-50"
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
          className="fixed inset-0 bg-black/90 dark:bg-black/95 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
        >
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 dark:hover:text-gray-400"
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
            className="absolute left-4 p-2 text-white hover:text-gray-300 dark:hover:text-gray-400"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 p-2 text-white hover:text-gray-300 dark:hover:text-gray-400"
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}

      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-[#111111] rounded-lg p-6 max-w-md w-full mx-4 space-y-4 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Delete All Images?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete all {images.length} images? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-3 py-1.5 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All
              </button>
            </div>
          </div>
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
