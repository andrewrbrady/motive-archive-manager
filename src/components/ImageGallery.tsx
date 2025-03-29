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
  ChevronRightSquare,
  ChevronLeftSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageFilterControls } from "./ImageFilterControls";
import { MotiveLogo } from "@/components/ui/MotiveLogo";
import Image from "next/image";
import ImageManager from "./ImageManager";
import { LoadingSpinner } from "@/components/ui/loading";
import LazyImage from "@/components/LazyImage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Pagination from "@/components/ui/pagination";

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
  category?: string;
  isPrimary?: boolean;
  [key: string]: any;
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
  pagination?: PaginationData;
  onPageChange?: (page: number) => void;
  className?: string;
  thumbnailSize?: { width: number; height: number };
  fullSize?: { width: number; height: number };
  showCategoryTabs?: boolean;
  onImageClick?: (image: Image) => void;
  isLoading?: boolean;
}

interface Filters {
  angle?: string;
  description?: string;
  movement?: string;
  tod?: string;
  view?: string;
  side?: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
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
  pagination,
  onPageChange,
  className = "",
  thumbnailSize = { width: 150, height: 100 },
  fullSize = { width: 800, height: 600 },
  showCategoryTabs = true,
  onImageClick,
  isLoading = false,
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
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [currentTab, setCurrentTab] = useState("all");
  const [galleryImages, setGalleryImages] = useState<Image[]>(images);
  const [showImageDialog, setShowImageDialog] = useState(false);

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
  const displayFilteredImages = galleryImages.filter((image) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const imageValue = image.metadata[key as keyof typeof image.metadata];
      if (typeof imageValue !== "string") return false;
      if (typeof value !== "string") return false;
      return imageValue.trim() === value.trim();
    });
  });

  const totalPages = Math.ceil(displayFilteredImages.length / itemsPerPage);

  // Add the new effect here after filteredImages and totalPages are declared
  // Add a new effect to ensure state consistency during mode transitions
  useEffect(() => {
    // Ensure mainIndex is valid for the current filtered images
    if (
      displayFilteredImages.length > 0 &&
      mainIndex >= displayFilteredImages.length
    ) {
      setMainIndex(displayFilteredImages.length - 1);
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
    displayFilteredImages,
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

  const handleExternalPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      const firstImageIndexOfNewPage = (newPage - 1) * itemsPerPage;
      setMainIndex(
        Math.min(firstImageIndexOfNewPage, displayFilteredImages.length - 1)
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
      setModalIndex((prev) => (prev + 1) % displayFilteredImages.length);
    } else {
      setMainIndex((prev) => (prev + 1) % displayFilteredImages.length);
    }
  }, [isModalOpen, displayFilteredImages.length]);

  const handlePrev = useCallback(() => {
    if (isModalOpen) {
      setModalIndex(
        (prev) =>
          (prev - 1 + displayFilteredImages.length) %
          displayFilteredImages.length
      );
    } else {
      setMainIndex(
        (prev) =>
          (prev - 1 + displayFilteredImages.length) %
          displayFilteredImages.length
      );
    }
  }, [isModalOpen, displayFilteredImages.length]);

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
          handleExternalPageChange(Math.max(1, currentPage - 1));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          handleExternalPageChange(Math.min(totalPages, currentPage + 1));
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
    handleExternalPageChange,
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
  const displayImages = displayFilteredImages.filter(
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

  useEffect(() => {
    if (currentTab === "all") {
      setGalleryImages(images);
    } else {
      setGalleryImages(
        images.filter((img) => img.metadata?.category === currentTab)
      );
    }
  }, [images, currentTab]);

  const handleImageClick = (image: Image) => {
    setSelectedImage(image);
    setShowImageDialog(true);
    if (onImageClick) {
      onImageClick(image);
    }
  };

  const handleCloseDialog = () => {
    setShowImageDialog(false);
  };

  const navigateImages = (direction: "next" | "prev") => {
    if (!selectedImage) return;

    const currentIndex = galleryImages.findIndex(
      (img) => img.id === selectedImage.id
    );
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === "next") {
      newIndex = (currentIndex + 1) % galleryImages.length;
    } else {
      newIndex =
        (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    }

    setSelectedImage(galleryImages[newIndex]);
  };

  // Extract unique categories from images
  const categories = [
    "all",
    ...Array.from(
      new Set(
        images.map((img) => img.metadata?.category).filter(Boolean) as string[]
      )
    ),
  ];

  if (isLoading) {
    return (
      <div
        className={cn(
          "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
          className
        )}
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <LazyImage
            key={`skeleton-${index}`}
            src=""
            alt="Loading"
            width={thumbnailSize.width}
            height={thumbnailSize.height}
            loadingVariant="skeleton"
          />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">No images available</div>
    );
  }

  return (
    <div className={className}>
      {showCategoryTabs && categories.length > 1 && (
        <Tabs
          defaultValue="all"
          value={currentTab}
          onValueChange={setCurrentTab}
          className="mb-4"
        >
          <TabsList>
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="capitalize"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {galleryImages.map((image) => (
          <div key={image.id} className="relative group cursor-pointer">
            <LazyImage
              src={image.url}
              alt={image.metadata?.description || image.filename || "Car image"}
              width={thumbnailSize.width}
              height={thumbnailSize.height}
              className="rounded-md"
              onClick={() => handleImageClick(image)}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="bg-white bg-opacity-70 hover:bg-opacity-100"
                onClick={() => handleImageClick(image)}
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
            </div>
            {image.metadata?.isPrimary && (
              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                Primary
              </div>
            )}
          </div>
        ))}
      </div>

      {pagination && pagination.pages > 1 && (
        <Pagination
          className="mt-4 flex justify-center"
          currentPage={pagination.page}
          totalPages={pagination.pages}
          onPageChange={handleExternalPageChange}
        />
      )}

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl w-full p-1 sm:p-6">
          <DialogTitle className="flex justify-between items-center">
            <span>
              {selectedImage?.metadata?.description ||
                selectedImage?.filename ||
                "Image"}
            </span>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" onClick={handleCloseDialog}>
                <X className="w-5 h-5" />
              </Button>
            </DialogClose>
          </DialogTitle>

          <div className="relative flex justify-center items-center">
            {selectedImage && (
              <LazyImage
                src={selectedImage.url}
                alt={
                  selectedImage.metadata?.description ||
                  selectedImage.filename ||
                  "Car image"
                }
                width={fullSize.width}
                height={fullSize.height}
                objectFit="contain"
                className="rounded-md"
              />
            )}

            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 p-1 bg-white/70 hover:bg-white/90 rounded-full"
              onClick={() => navigateImages("prev")}
            >
              <ChevronLeftSquare className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 p-1 bg-white/70 hover:bg-white/90 rounded-full"
              onClick={() => navigateImages("next")}
            >
              <ChevronRightSquare className="w-6 h-6" />
            </Button>
          </div>

          {selectedImage?.metadata && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(selectedImage.metadata)
                .filter(([key]) => key !== "isPrimary")
                .map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="font-medium capitalize mr-2">{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ImageGallery;
