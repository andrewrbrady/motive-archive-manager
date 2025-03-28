"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Filter,
  Loader2,
  Check,
  Compass,
  Eye,
  Sun,
  Move,
  Plus,
  Trash2,
  Star,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageFilterControls } from "./ImageFilterControls";
import { MotiveLogo } from "@/components/ui/MotiveLogo";
import Image from "next/image";
import ImageManager from "./ImageManager";
import { LoadingSpinner } from "@/components/ui/loading";

interface ImageMetadata {
  angle?: string;
  description?: string;
  movement?: string;
  tod?: string;
  view?: string;
  side?: string;
  aiAnalysis?: {
    angle?: string;
    description?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
  };
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  error?: string;
  currentStep?: string;
  imageUrl?: string;
  metadata?: ImageMetadata;
}

interface Image {
  id: string;
  url: string;
  filename: string;
  metadata: ImageMetadata;
  variants?: {
    [key: string]: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ImageGalleryProps {
  images: Image[];
  isEditMode: boolean;
  onRemoveImage: (indices: number[], deleteFromStorage?: boolean) => void;
  onImagesChange: (files: FileList) => void;
  uploading: boolean;
  uploadProgress: UploadProgress[];
  showMetadata?: boolean;
  showFilters?: boolean;
  title: string;
  aspectRatio?: string;
  thumbnailsPerRow?: number;
  rowsPerPage?: number;
  contextInput?: React.ReactNode;
  carId: string;
  onImageProgress?: (progress: UploadProgress) => void;
  onDeleteSingleImage?: (imageId: string, filename: string) => Promise<void>;
  externalFileInputRef?: React.RefObject<HTMLInputElement>;
  onExternalFileSelect?: (files: File[]) => void;
  primaryImageId?: string;
  onPrimaryImageChange?: (imageId: string) => void;
}

interface Filters {
  angle?: string;
  description?: string;
  movement?: string;
  tod?: string;
  view?: string;
  side?: string;
}

// Common classes for consistent styling
const skeletonClasses =
  "bg-background-secondary dark:bg-background-secondary rounded-lg relative w-full";
const cardClasses =
  "dark:bg-background-primary border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-lg";

// Update ImageSkeleton component
const ImageSkeleton = ({ aspectRatio = "4/3" }: { aspectRatio?: string }) => (
  <div className={skeletonClasses} style={{ aspectRatio }} />
);

export function ImageGallery({
  images,
  isEditMode,
  onRemoveImage,
  onImagesChange,
  uploading,
  uploadProgress,
  showMetadata = true,
  showFilters = false,
  title,
  aspectRatio = "4/3",
  thumbnailsPerRow = 8,
  rowsPerPage = 3,
  contextInput,
  carId,
  onImageProgress,
  onDeleteSingleImage,
  externalFileInputRef,
  onExternalFileSelect,
  primaryImageId,
  onPrimaryImageChange,
}: ImageGalleryProps) {
  const [mainIndex, setMainIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMainVisible, setIsMainVisible] = useState(true);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const mainImageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const [hasSetInitialImage, setHasSetInitialImage] = useState(false);
  const prevImagesLengthRef = useRef(images.length);
  const initialLoadRef = useRef(true);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const maxSelection = 10;
  const itemsPerPage = thumbnailsPerRow * rowsPerPage;
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);

  useEffect(() => {
    if (uploading && uploadProgress.length > 0) {
      // We no longer need to set dialog open state since StatusNotification
      // is automatically shown by the parent component
      // setIsUploadDialogOpen(true);
    }
  }, [uploading, uploadProgress]);

  // Update effect to handle transition from no images to having images
  useEffect(() => {
    const hasImages = images.length > 0;
    const hadNoImages = prevImagesLengthRef.current === 0;

    if (hasImages && hadNoImages && initialLoadRef.current) {
      // Only set initial state on first load from empty to having images
      setMainIndex(0);
      setMainImageLoaded(true);
      setHasSetInitialImage(true);
      setIsMainVisible(true);
      initialLoadRef.current = false;
    }

    prevImagesLengthRef.current = images.length;
  }, [images.length]);

  // Reset initialLoadRef when all images are removed
  useEffect(() => {
    if (images.length === 0) {
      initialLoadRef.current = true;
    }
  }, [images.length]);

  useEffect(() => {
    if (isEditMode) {
      // When entering edit mode, only reset selections and maintain the current view
      setSelectedImages([]);
      // Keep currentPage and mainIndex consistent across mode transitions
    } else {
      // When exiting edit mode
      setSelectedImages([]); // Clear selections when exiting edit mode
      setImageErrors({}); // Reset image errors when exiting edit mode
      // Don't reset mainIndex or currentPage to keep the same image in view

      // Ensure main image loaded state is true to prevent jarring transitions
      setMainImageLoaded(true);
    }
  }, [isEditMode]);

  // Extract available filter values from all images, not just filtered ones
  const allAvailableFilters = React.useMemo(() => {
    const filterSet = {
      angles: new Set<string>(),
      movements: new Set<string>(),
      tods: new Set<string>(),
      views: new Set<string>(),
      sides: new Set<string>(),
    };

    images.forEach((image) => {
      const { metadata } = image;
      if (metadata.angle?.trim()) filterSet.angles.add(metadata.angle.trim());
      if (metadata.movement?.trim())
        filterSet.movements.add(metadata.movement.trim());
      if (metadata.tod?.trim()) filterSet.tods.add(metadata.tod.trim());
      if (metadata.view?.trim()) filterSet.views.add(metadata.view.trim());
      if (metadata.side?.trim()) filterSet.sides.add(metadata.side.trim());
    });

    return {
      angles: Array.from(filterSet.angles),
      movements: Array.from(filterSet.movements),
      tods: Array.from(filterSet.tods),
      views: Array.from(filterSet.views),
      sides: Array.from(filterSet.sides),
    };
  }, [images]);

  // Filter images based on selected filters
  const filteredImages = images.filter((image) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const imageValue = image.metadata[key as keyof typeof image.metadata];
      if (typeof imageValue !== "string") return false;
      if (typeof value !== "string") return false;
      return imageValue.trim() === value.trim();
    });
  });

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);

  // Add the new effect here after filteredImages and totalPages are declared
  // Add a new effect to ensure state consistency during mode transitions
  useEffect(() => {
    // Ensure mainIndex is valid for the current filtered images
    if (filteredImages.length > 0 && mainIndex >= filteredImages.length) {
      setMainIndex(filteredImages.length - 1);
    }

    // Ensure we're maintaining the correct page
    const correctPage = Math.ceil((mainIndex + 1) / itemsPerPage);
    if (
      currentPage !== correctPage &&
      correctPage <= totalPages &&
      correctPage > 0
    ) {
      setCurrentPage(correctPage);
    }
  }, [
    isEditMode,
    filteredImages,
    mainIndex,
    currentPage,
    itemsPerPage,
    totalPages,
  ]);

  const handleFilterChange = (
    key: keyof Filters,
    value: string | undefined
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === prev[key] ? undefined : value,
    }));
  };

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
        const firstImageIndexOfNewPage = (newPage - 1) * itemsPerPage;
        setMainIndex(
          Math.min(firstImageIndexOfNewPage, filteredImages.length - 1)
        );
        setMainImageLoaded(true);
      }
    },
    [totalPages, itemsPerPage, filteredImages.length]
  );

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
    console.log(
      "[DEBUG ImageGallery] handleDeleteSelected called for",
      selectedImages.length,
      "images"
    );
    if (onRemoveImage) {
      console.log(
        "[DEBUG ImageGallery] Calling onRemoveImage with indices:",
        selectedImages,
        "and deleteFromStorage=true"
      );
      // Explicitly set deleteFromStorage to true
      onRemoveImage(
        selectedImages.map((index) => index),
        true
      );
      setSelectedImages([]);
    }
  }, [onRemoveImage, selectedImages]);

  const handleDeleteAll = async () => {
    console.log("=========== DELETE ALL BUTTON CLICKED ===========");
    console.log("[DEBUG ImageGallery] Starting handleDeleteAll function");
    setShowDeleteAllConfirm(false);
    const indices = Array.from({ length: images.length }, (_, i) => i);

    console.log(
      `[DEBUG ImageGallery] Created ${indices.length} indices for deletion`
    );
    console.log(
      `[DEBUG ImageGallery] Images to delete:`,
      images.map((img) => ({
        id: img.id,
        filename: img.filename,
      }))
    );

    // Update progress to indicate deletion starting
    onImageProgress?.({
      fileName: "all-images",
      progress: 0,
      status: "uploading",
      currentStep: `Starting batch deletion of ${indices.length} images`,
    });

    try {
      console.log("[DEBUG ImageGallery] Attempting to delete all images", {
        indices,
        totalImages: images.length,
        carId,
      });

      // Now try the actual operation - explicitly set deleteFromStorage to true
      if (!onRemoveImage) {
        console.error(
          "[DEBUG ImageGallery] onRemoveImage function is not available"
        );
        throw new Error("onRemoveImage function is not available");
      }

      console.log(
        "[DEBUG ImageGallery] Calling onRemoveImage with deleteFromStorage=true (explicitly boolean true)"
      );

      // Call the onRemoveImage with explicit deleteFromStorage=true
      // Make absolutely sure deleteFromStorage is true here (not truthy, but boolean true)
      const deleteFromStorageParam = true; // Explicitly boolean true
      console.log(
        `Type of deleteFromStorageParam: ${typeof deleteFromStorageParam}`
      );

      // This is the actual API call
      await onRemoveImage(indices, deleteFromStorageParam);

      // Update progress after successful deletion
      onImageProgress?.({
        fileName: "all-images",
        progress: 100,
        status: "complete",
        currentStep: `Successfully deleted ${indices.length} images`,
      });

      console.log("[DEBUG ImageGallery] Batch deletion completed successfully");

      // Remove the automatic page reload to allow the API request to complete
      // Instead, let the API response trigger any necessary UI updates
      console.log(
        "[DEBUG ImageGallery] Deletion complete, waiting for API response"
      );

      // Only refresh the page if explicitly requested or necessary
      // For now, commenting out the automatic reload that was causing issues
      /*
      setTimeout(() => {
        console.log("[DEBUG ImageGallery] Reloading page after delete all");
        window.location.reload();
      }, 1000);
      */
    } catch (error) {
      console.error("[DEBUG ImageGallery] Error in handleDeleteAll:", error);
      onImageProgress?.({
        fileName: "all-images",
        progress: 0,
        status: "error",
        error: `Failed to delete images: ${error}`,
        currentStep: "Deletion failed",
      });
    }
  };

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
    if (e.target.files) {
      if (onExternalFileSelect) {
        onExternalFileSelect(Array.from(e.target.files));
      }
      if (onImagesChange) {
        onImagesChange(e.target.files);
      }
    }
  };

  const handleImageSelect = (index: number) => {
    setSelectedImages((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      if (prev.length >= maxSelection) {
        return prev;
      }
      return [...prev, index];
    });
  };

  // Modify the handleThumbnailClick function to improve transition
  const handleThumbnailClick = (index: number) => {
    // Allow thumbnail clicking in both modes, but handle selection differently
    if (isEditMode) {
      handleImageSelect(index);
    } else {
      // Apply a smoother transition by setting main image loaded first
      setMainImageLoaded(true);
      setMainIndex(index);
    }
  };

  const handleImageProgress = (progress: UploadProgress) => {
    // Forward progress to parent component
    if (progress.status === "complete" && progress.imageUrl) {
      const index = images.findIndex((img) => img.url === progress.imageUrl);
      if (index !== -1) {
        handleImageSelect(index);
      }
    }
  };

  const handleImageError = (imageUrl: string) => {
    setImageErrors((prev) => ({ ...prev, [imageUrl]: true }));
  };

  // Filter out images that have errored
  const displayImages = filteredImages.filter(
    (image) => !imageErrors[image.url]
  );

  const getImageUrl = (url: string, variant?: string) => {
    // Remove /public if it exists at the end
    const baseUrl = url.replace(/\/public$/, "");
    if (variant) {
      return `${baseUrl}/${variant}`;
    }
    return `${baseUrl}/public`;
  };

  // Add a function to handle setting a thumbnail image
  const handleSetAsPrimary = (image: Image, event: React.MouseEvent) => {
    event.stopPropagation();

    // Use the image's database ID (stored in the id property) rather than extracting from URL
    let imageId = image.id;

    // If image ID is empty, log an error and don't proceed
    if (!imageId || imageId.trim() === "") {
      console.error(
        `[SET PRIMARY IMAGE] Cannot set primary image: No valid database ID found for image`,
        image
      );
      return;
    }

    console.log(
      `[SET PRIMARY IMAGE] Setting image ${imageId} as primary image`
    );
    console.log(
      `[SET PRIMARY IMAGE] onPrimaryImageChange available:`,
      !!onPrimaryImageChange
    );

    if (onPrimaryImageChange) {
      console.log(
        `[SET PRIMARY IMAGE] Calling onPrimaryImageChange with imageId:`,
        imageId
      );
      onPrimaryImageChange(imageId);
    } else {
      console.error(
        "[SET PRIMARY IMAGE] Error: onPrimaryImageChange callback is not available"
      );
    }
  };

  React.useEffect(() => {
    // Log the primary image ID value when it changes
    if (primaryImageId) {
      console.log("[ImageGallery] Current primaryImageId:", primaryImageId);
    } else {
      console.log("[ImageGallery] No primaryImageId set");
    }
  }, [primaryImageId]);

  // Log all image IDs on initial load
  React.useEffect(() => {
    if (images && images.length > 0) {
      console.log(
        "[ImageGallery] First few image IDs:",
        images.slice(0, Math.min(3, images.length)).map((img) => ({
          id: img.id,
          filename: img.filename,
          url: img.url,
        }))
      );
    }
  }, [images]);

  if (!images || images.length === 0 || filteredImages.length === 0) {
    const placeholderCount = 15; // 3x5 grid

    return (
      <div>
        <div className="flex gap-6">
          <div className="w-2/3">
            <div
              className={`relative aspect-[4/3] w-full overflow-hidden rounded-lg ${skeletonClasses}`}
            >
              {uploading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <MotiveLogo className="w-16 h-16 opacity-50" />
                  <span className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] uppercase tracking-wide text-sm font-medium">
                    {!images || images.length === 0
                      ? "No Images Available"
                      : "No Images Match The Selected Filters"}
                  </span>
                </div>
              )}
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
                    className="px-3 py-1.5 border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-md hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] disabled:opacity-50 flex items-center gap-2 w-full justify-center text-sm"
                  >
                    {uploading ? (
                      <>
                        <LoadingSpinner size="sm" />
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Add Images
                      </>
                    )}
                  </button>
                </div>
                <div className="flex flex-col gap-4">{contextInput}</div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: placeholderCount }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[4/3] rounded-lg bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] relative group"
                >
                  {isEditMode && index === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] text-sm">
                        Click &quot;Add Images&quot; to begin
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {showFilters && (
        <ImageFilterControls
          filters={filters}
          onFilterChange={handleFilterChange}
          availableFilters={allAvailableFilters}
        />
      )}
      <div className="flex gap-6">
        <div className="w-2/3 space-y-3">
          <div ref={mainImageRef} className="sticky top-4 mb-4">
            <div
              className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-background-secondary dark:bg-background-secondary transition-opacity duration-300"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {displayImages[mainIndex] && (
                <Image
                  key={`${displayImages[mainIndex].id}`}
                  src={getImageUrl(displayImages[mainIndex].url)}
                  alt={
                    title
                      ? `${title} - View ${mainIndex + 1}`
                      : `View ${mainIndex + 1} of ${displayImages.length}`
                  }
                  className="object-cover transition-all duration-300"
                  fill
                  sizes="100vw"
                  priority
                  onLoadingComplete={() => {
                    setMainImageLoaded(true);
                  }}
                  onError={() => handleImageError(displayImages[mainIndex].url)}
                />
              )}
              <button
                onClick={() => {
                  setModalIndex(mainIndex);
                  setIsModalOpen(true);
                }}
                className="absolute top-4 right-4 p-2 bg-black/50 dark:bg-[var(--background-primary)]/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-[var(--background-primary)]/20"
                aria-label="Open fullscreen view"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 dark:bg-[var(--background-primary)]/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-[var(--background-primary)]/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 dark:bg-[var(--background-primary)]/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-[var(--background-primary)]/20"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showMetadata && mainImageLoaded && (
            <div className={`${cardClasses} shadow-sm p-3`}>
              <div className="grid grid-cols-4 divide-x divide-zinc-200 dark:divide-zinc-800">
                <div className="flex items-center px-4 first:pl-0 last:pr-0">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
                    <span className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] uppercase text-xs font-medium">
                      Angle
                    </span>
                  </div>
                  <span className="uppercase text-xs ml-auto text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-subtle))]">
                    {displayImages[
                      mainIndex
                    ]?.metadata?.angle?.toLowerCase() === "not applicable"
                      ? ""
                      : displayImages[mainIndex]?.metadata?.angle || ""}
                  </span>
                </div>
                <div className="flex items-center px-4 first:pl-0 last:pr-0">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
                    <span className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] uppercase text-xs font-medium">
                      View
                    </span>
                  </div>
                  <span className="uppercase text-xs ml-auto text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-subtle))]">
                    {displayImages[mainIndex]?.metadata?.view || "N/A"}
                  </span>
                </div>
                <div className="flex items-center px-4 first:pl-0 last:pr-0">
                  <div className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
                    <span className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] uppercase text-xs font-medium">
                      Time of Day
                    </span>
                  </div>
                  <span className="uppercase text-xs ml-auto text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-subtle))]">
                    {displayImages[mainIndex]?.metadata?.tod || "N/A"}
                  </span>
                </div>
                <div className="flex items-center px-4 first:pl-0 last:pr-0">
                  <div className="flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]" />
                    <span className="text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] uppercase text-xs font-medium">
                      Movement
                    </span>
                  </div>
                  <span className="uppercase text-xs ml-auto text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-subtle))]">
                    {displayImages[mainIndex]?.metadata?.movement || "N/A"}
                  </span>
                </div>
              </div>
              {displayImages[mainIndex]?.metadata?.description && (
                <div className="mt-2 text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-subtle))] border-t border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] pt-2">
                  {displayImages[mainIndex].metadata.description}
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
                    const currentPageImages = displayImages
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
                        prev.filter((i) => !currentPageImages.includes(i))
                      );
                    } else {
                      setSelectedImages((prev) => [
                        ...new Set([...prev, ...currentPageImages]),
                      ]);
                    }
                  }}
                  className="px-3 py-1.5 border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-md hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] flex items-center gap-2 text-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Select All
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedImages.length === 0}
                  className="px-3 py-1.5 border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-md hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  <X className="w-3.5 h-3.5" />
                  {selectedImages.length > 0 ? (
                    <>
                      Delete ({selectedImages.length})
                      <span className="text-xs text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))] ml-2">
                        ⇧⌫
                      </span>
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  className="px-3 py-1.5 border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-md hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] flex items-center gap-2 text-sm group"
                >
                  <Trash2 className="w-3.5 h-3.5 group-hover:text-destructive-500 dark:group-hover:text-destructive-400" />
                  Delete All
                </button>
                <button
                  onClick={() => {
                    const inputRef = externalFileInputRef || fileInputRef;
                    inputRef.current?.click();
                  }}
                  disabled={uploading}
                  className="px-3 py-1.5 border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-md hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] disabled:opacity-50 flex items-center gap-2 text-sm ml-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Images
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {contextInput}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                  accept="image/*"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {displayImages
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              )
              .map((image, index) => {
                const actualIndex = (currentPage - 1) * itemsPerPage + index;
                const isSelected = selectedImages.includes(actualIndex);

                return (
                  <div
                    key={image.id}
                    className={cn(
                      "relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300",
                      isEditMode && "hover:opacity-90"
                    )}
                    style={{ aspectRatio }}
                  >
                    <Image
                      src={getImageUrl(image.url, "width=200")}
                      alt={image.metadata.description || ""}
                      fill
                      className={cn(
                        "object-cover transition-all duration-300",
                        isMainVisible && actualIndex === mainIndex
                          ? "ring-2 ring-accent-primary dark:ring-accent-primary"
                          : "opacity-75 dark:opacity-60",
                        isSelected
                          ? "ring-2 ring-destructive-500 dark:ring-destructive-500"
                          : ""
                      )}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      onError={() => handleImageError(image.url)}
                    />
                    <div
                      onClick={() =>
                        isEditMode
                          ? handleImageSelect(actualIndex)
                          : handleThumbnailClick(actualIndex)
                      }
                      className={cn(
                        "absolute inset-0 rounded-lg transition-colors duration-300",
                        isSelected
                          ? "bg-destructive-500 bg-opacity-10"
                          : "hover:bg-[hsl(var(--background))] bg-opacity-5 dark:hover:bg-[var(--background-primary)]/5"
                      )}
                    />

                    {isEditMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering the parent div's onClick
                          console.log(
                            `============ INDIVIDUAL IMAGE DELETE CLICKED ============`
                          );
                          console.log(
                            `Image: ${image.id}, filename: ${image.filename}`
                          );
                          console.log(
                            `DeleteFromStorage is being FORCED to TRUE`
                          );
                          if (onDeleteSingleImage && image.id) {
                            console.log(
                              `Using onDeleteSingleImage for image ${image.id}`
                            );
                            onDeleteSingleImage(image.id, image.filename)
                              .then(() =>
                                console.log(
                                  `Delete operation completed for image ${image.id}`
                                )
                              )
                              .catch((err) =>
                                console.error(
                                  `Error deleting image ${image.id}:`,
                                  err
                                )
                              );
                          } else {
                            // Fallback to the original method
                            console.log(
                              `Using onRemoveImage for image at index ${actualIndex} with deleteFromStorage=true`
                            );
                            // Force deleteFromStorage to be a boolean true, not just truthy
                            onRemoveImage([actualIndex], true);
                          }
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/70 dark:bg-[var(--background-primary)]/70 rounded-full text-white hover:bg-black/90 dark:hover:bg-[var(--background-primary)]/90 z-10"
                        aria-label="Delete image"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    )}

                    {!isEditMode && (
                      <button
                        onClick={(e) => {
                          // Prevent the default event and stop propagation
                          e.preventDefault();
                          e.stopPropagation();

                          console.log(
                            `[SET FEATURED IMAGE] Clicked for image:`,
                            image
                          );
                          console.log(
                            `[SET FEATURED IMAGE] Current primaryImageId:`,
                            primaryImageId
                          );
                          console.log(
                            `[SET FEATURED IMAGE] Is primary image? Direct match:`,
                            primaryImageId === image.id,
                            `URL match:`,
                            image.url.includes(primaryImageId || "")
                          );

                          // Call the handler with the entire image object
                          handleSetAsPrimary(image, e);
                        }}
                        className={`absolute top-1 right-9 p-1 ${
                          primaryImageId === image.id ||
                          (primaryImageId && image.url.includes(primaryImageId))
                            ? "bg-yellow-500/90 text-black hover:bg-yellow-400/90 ring-2 ring-yellow-500"
                            : "bg-black/70 dark:bg-[var(--background-primary)]/70 text-white hover:bg-black/90 dark:hover:bg-[var(--background-primary)]/90"
                        } rounded-full z-10`}
                        aria-label={
                          primaryImageId === image.id ||
                          (primaryImageId && image.url.includes(primaryImageId))
                            ? "Current featured image"
                            : "Set as featured image"
                        }
                        title={
                          primaryImageId === image.id ||
                          (primaryImageId && image.url.includes(primaryImageId))
                            ? "Current featured image"
                            : "Set as featured image"
                        }
                        type="button"
                      >
                        <ImageIcon
                          className={`w-3.5 h-3.5 ${
                            primaryImageId === image.id ||
                            (primaryImageId &&
                              image.url.includes(primaryImageId))
                              ? "text-black"
                              : "text-white"
                          }`}
                        />
                      </button>
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
                className="p-2 bg-black/50 dark:bg-[var(--background-primary)]/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-[var(--background-primary)]/20 disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 bg-black/50 dark:bg-[var(--background-primary)]/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-[var(--background-primary)]/20 disabled:opacity-50"
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
            className="absolute top-4 right-4 p-2 text-white hover:text-[hsl(var(--foreground-subtle))] dark:hover:text-[hsl(var(--foreground-muted))]"
            aria-label="Close fullscreen view"
          >
            <X className="w-6 h-6" />
          </button>
          <Image
            src={getImageUrl(displayImages[modalIndex].url)}
            alt={`Full size view ${modalIndex + 1} of ${displayImages.length}`}
            className="max-w-full max-h-[90vh] object-contain"
            fill
            sizes="100vw"
            priority
          />
          <button
            onClick={handlePrev}
            className="absolute left-4 p-2 text-white hover:text-[hsl(var(--foreground-subtle))] dark:hover:text-[hsl(var(--foreground-muted))]"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 p-2 text-white hover:text-[hsl(var(--foreground-subtle))] dark:hover:text-[hsl(var(--foreground-muted))]"
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}

      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center">
          <div className={`${cardClasses} p-6 max-w-md w-full mx-4 space-y-4`}>
            <h3 className="text-lg font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]">
              Delete All Images?
            </h3>
            <p className="text-sm text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
              Are you sure you want to delete all {images.length} images? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-3 py-1.5 border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] rounded-md hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))] text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-3 py-1.5 border border-destructive-200 dark:border-destructive-800 rounded-md hover:bg-destructive-50 dark:hover:bg-destructive-950 bg-opacity-30 text-destructive-600 dark:text-destructive-400 text-sm flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageManager
        selectedImages={selectedImages.map((index) => images[index].url)}
        onSelect={(imageUrl) => {
          const index = images.findIndex((img) => img.url === imageUrl);
          if (index !== -1) {
            handleImageSelect(index);
          }
        }}
        maxSelection={maxSelection}
        showUploader={isEditMode}
        onImageProgress={handleImageProgress}
        carId={carId}
      />
    </div>
  );
}

export default ImageGallery;
