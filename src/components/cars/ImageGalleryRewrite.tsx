import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ImageIcon,
  Trash2,
  Pencil,
  Eye,
  Filter,
  Copy,
  Check,
  UploadIcon,
  RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { transformImageUrl } from "@/lib/imageTransform";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ImageFilterButton } from "@/components/cars/ImageGalleryEnhanced";
import { Button } from "@/components/ui/button";

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

interface ImageProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  imageUrl?: string;
  metadata?: ImageMetadata;
  error?: string;
  currentStep?: string;
}

interface ImageType {
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
    aiAnalysis?: {
      angle?: string;
      description?: string;
      movement?: string;
      tod?: string;
      view?: string;
      side?: string;
    };
  };
  variants?: {
    [key: string]: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ImageGalleryRewriteProps {
  images: ImageType[];
  onRemoveImage: (indices: number[], deleteFromStorage: boolean) => void;
  onImagesChange?: (images: ImageType[]) => void;
  onPrimaryImageChange?: (imageId: string) => void;
  showFilters?: boolean;
  vehicleInfo?: any;
  carId: string;
  onFilterOptionsChange?: (options: Record<string, string[]>) => void;
}

interface FilterState {
  angle?: string;
  view?: string;
  movement?: string;
  tod?: string;
  side?: string;
}

export function ImageGalleryRewrite({
  images: initialImages,
  onRemoveImage,
  onImagesChange,
  onPrimaryImageChange,
  showFilters,
  vehicleInfo,
  carId,
  onFilterOptionsChange,
}: ImageGalleryRewriteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-based state
  const isEditMode = searchParams?.get("mode") === "edit";
  const currentImageId = searchParams?.get("image") || initialImages[0]?.id;
  const urlPage = searchParams?.get("page");
  const primaryImageId = initialImages.find(
    (img) => img.id === currentImageId
  )?.id;

  // Core state - simplified
  const [images, setImages] = useState<ImageType[]>(initialImages);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(
    urlPage ? parseInt(urlPage) - 1 : 0
  );
  const [filters, setFilters] = useState<FilterState>({});
  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>(
    {}
  );
  const [copiedField, setCopiedField] = useState<"filename" | "url" | null>(
    null
  );

  // UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<ImageProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 15; // 3 columns x 5 rows

  // Safety mechanism
  const [isMounted, setIsMounted] = useState(false);
  const safeToDeleteRef = useRef(false);

  // Initialize component and prevent auto-deletions
  useEffect(() => {
    setIsMounted(true);
    console.log("ImageGallery: Initial mounting phase - deletions blocked");

    // Only enable deletions after component is fully mounted and stable
    const safetyTimer = setTimeout(() => {
      safeToDeleteRef.current = true;
      console.log("ImageGallery: Component mounted and ready for user actions");
    }, 2000);

    return () => {
      clearTimeout(safetyTimer);
      setIsMounted(false);
    };
  }, []);

  // Update the initialization effect to properly handle changes to initialImages
  useEffect(() => {
    if (!isMounted) return;

    const initialImagesLength = initialImages?.length || 0;
    const currentImagesLength = images.length;

    console.log(
      `ImageGallery: Initializing with ${initialImagesLength} images (current: ${currentImagesLength})`
    );

    // Compare initial and current images by ID to detect real changes
    const initialImageIds = new Set(initialImages?.map((img) => img.id) || []);
    const currentImageIds = new Set(images.map((img) => img.id));

    // Check for changes in the actual image data, not just IDs
    const hasDifferentImages =
      initialImagesLength !== currentImagesLength ||
      initialImages?.some((img) => !currentImageIds.has(img.id)) ||
      images.some((img) => !initialImageIds.has(img.id));

    // Check deeply for changes in metadata or other properties
    const hasUpdatedImageData = initialImages?.some((initialImg) => {
      const currentImg = images.find((img) => img.id === initialImg.id);
      if (!currentImg) return false;

      // Check for metadata changes that would require updates
      if (
        JSON.stringify(initialImg.metadata) !==
        JSON.stringify(currentImg.metadata)
      ) {
        console.log(`Metadata changed for image ${initialImg.id}`);
        return true;
      }

      return false;
    });

    if (hasDifferentImages || hasUpdatedImageData) {
      console.log("Images have changed, updating gallery state");
      setImages(initialImages);
    } else {
      console.log(
        "No meaningful image changes detected, preserving current state"
      );
    }

    // Extract filter options from images regardless of image changes
    if (initialImages?.length > 0) {
      const options = {
        angles: new Set<string>(),
        views: new Set<string>(),
        movements: new Set<string>(),
        tods: new Set<string>(),
        sides: new Set<string>(),
      };

      initialImages.forEach((image) => {
        const { metadata } = image;
        if (metadata?.angle?.trim()) options.angles.add(metadata.angle.trim());
        if (metadata?.view?.trim()) options.views.add(metadata.view.trim());
        if (metadata?.movement?.trim())
          options.movements.add(metadata.movement.trim());
        if (metadata?.tod?.trim()) options.tods.add(metadata.tod.trim());
        if (metadata?.side?.trim()) options.sides.add(metadata.side.trim());
      });

      const newFilterOptions = {
        angles: Array.from(options.angles).sort(),
        views: Array.from(options.views).sort(),
        movements: Array.from(options.movements).sort(),
        tods: Array.from(options.tods).sort(),
        sides: Array.from(options.sides).sort(),
      };

      setFilterOptions(newFilterOptions);
      if (onFilterOptionsChange) {
        onFilterOptionsChange(newFilterOptions);
      }
    }
  }, [initialImages, isMounted, onFilterOptionsChange, images]);

  // Safe image removal function
  const safeRemoveImage = useCallback(
    (indices: number[], deleteFromStorage: boolean) => {
      // Safety check 1: Component must be mounted
      if (!isMounted) {
        console.error("❌ Cannot delete images - component not fully mounted");
        return;
      }

      // Safety check 2: After initialization period
      if (!safeToDeleteRef.current) {
        console.error("❌ Cannot delete images during initialization period");
        return;
      }

      // Safety check 3: Must have valid indices
      if (!indices.length) {
        console.error("❌ Cannot delete images - no indices provided");
        return;
      }

      // Safety check 4: Must have actual user selections for explicit deletions
      if (deleteFromStorage && selectedImages.size === 0) {
        console.error(
          "❌ Cannot permanently delete images without user selection"
        );
        return;
      }

      console.log(`✅ Safe deletion of ${indices.length} images`, {
        deleteFromStorage,
        selectedImageCount: selectedImages.size,
      });

      // Call the original handler
      onRemoveImage(indices, deleteFromStorage);
    },
    [isMounted, onRemoveImage, selectedImages.size]
  );

  // Filter images based on selected filters
  const filteredImages = useMemo(() => {
    return images.filter((image: ImageType) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return image.metadata[key as keyof typeof image.metadata] === value;
      });
    });
  }, [images, filters]);

  // Derived state - Update mainIndex to use filteredImages
  const mainIndex = useMemo(() => {
    const index = filteredImages.findIndex((img) => img.id === currentImageId);
    return index >= 0 ? index : 0;
  }, [filteredImages, currentImageId]);

  // Update URL when page changes
  const handlePageChange = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("page", (newPage + 1).toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Navigation handlers - Update to handle page changes correctly
  const handlePrev = useCallback(() => {
    const prevIndex =
      (mainIndex - 1 + filteredImages.length) % filteredImages.length;
    const targetPage = Math.floor(prevIndex / itemsPerPage);

    // Update both page and image in URL
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("image", filteredImages[prevIndex].id);
    params.set("page", (targetPage + 1).toString());
    router.replace(`?${params.toString()}`, { scroll: false });

    // Update local state
    setCurrentPage(targetPage);
  }, [mainIndex, filteredImages, itemsPerPage, router, searchParams]);

  const handleNext = useCallback(() => {
    const nextIndex = (mainIndex + 1) % filteredImages.length;
    const targetPage = Math.floor(nextIndex / itemsPerPage);

    // Update both page and image in URL
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("image", filteredImages[nextIndex].id);
    params.set("page", (targetPage + 1).toString());
    router.replace(`?${params.toString()}`, { scroll: false });

    // Update local state
    setCurrentPage(targetPage);
  }, [mainIndex, filteredImages, itemsPerPage, router, searchParams]);

  // Set main image
  const setMainImage = useCallback(
    (imageId: string) => {
      const imageIndex = filteredImages.findIndex((img) => img.id === imageId);
      if (imageIndex >= 0) {
        const targetPage = Math.floor(imageIndex / itemsPerPage);

        // Update both page and image in URL
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.set("image", imageId);
        params.set("page", (targetPage + 1).toString());
        router.replace(`?${params.toString()}`, { scroll: false });

        // Update local state
        setCurrentPage(targetPage);
      }
    },
    [filteredImages, itemsPerPage, router, searchParams]
  );

  // Handle filter changes
  const handleFilterChange = (type: string, value: string) => {
    // Reset to first page when changing filters
    handlePageChange(0);

    setFilters((prev: FilterState) => {
      const newFilters = { ...prev };
      if (value === newFilters[type as keyof FilterState]) {
        delete newFilters[type as keyof FilterState];
      } else {
        newFilters[type as keyof FilterState] = value;
      }
      return newFilters;
    });
  };

  const handleResetFilters = () => {
    // Reset to first page when clearing filters
    handlePageChange(0);
    setFilters({});
  };

  // URL update helpers
  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams?.toString() || "");

      // First, remove any irrelevant parameters
      const irrelevantParams = ["page", "pageSize", "view", "edit", "search"];
      irrelevantParams.forEach((param) => params.delete(param));

      // Then update with our gallery-specific parameters
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Only include the query string if we have parameters
      const queryString = params.toString();
      const newUrl = queryString ? `?${queryString}` : window.location.pathname;

      router.replace(newUrl, { scroll: false });
    },
    [router, searchParams]
  );

  const toggleEditMode = useCallback(() => {
    console.log(
      `Toggling mode from ${isEditMode ? "edit" : "view"} to ${
        isEditMode ? "view" : "edit"
      }`
    );

    // Set a flag in localStorage to prevent automatic refreshes
    // for a short period during mode change
    localStorage.setItem("preventAutoRefresh", "true");

    // First update the URL to change the mode
    updateUrl({ mode: isEditMode ? null : "edit" });

    // Instead of forcing a server refresh immediately,
    // let the URL update take effect first
    setTimeout(() => {
      if (onImagesChange) {
        console.log("Mode toggle: selective refresh");
        // Clear the prevention flag
        localStorage.removeItem("preventAutoRefresh");
      }
    }, 500);
  }, [isEditMode, updateUrl, onImagesChange]);

  // Handle delete selection with stronger server synchronization
  const handleDeleteSelected = useCallback(async () => {
    console.log("Delete selected:", selectedImages.size, "images");

    if (selectedImages.size === 0) {
      console.log("No images selected");
      return;
    }

    // Map the selected image IDs back to their indices
    const selectedIndices: number[] = [];
    const selectedIds: string[] = Array.from(selectedImages);

    selectedIds.forEach((id) => {
      const index = images.findIndex((img) => img.id === id);
      if (index !== -1) {
        selectedIndices.push(index);
      }
    });

    console.log(`Selected indices for deletion: ${selectedIndices.join(", ")}`);

    if (selectedIndices.length === 0) {
      console.log("No valid indices found for deletion");
      return;
    }

    // Confirm deletion with the user
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIndices.length} image(s)?`
      )
    ) {
      console.log("Deletion canceled by user");
      return;
    }

    // First, update the UI optimistically
    const updatedImages = images.filter((img) => !selectedIds.includes(img.id));
    setImages(updatedImages);

    try {
      // Call the safe delete function - this will trigger server-side deletion
      console.log(`Deleting ${selectedIndices.length} images from server...`);
      await safeRemoveImage(selectedIndices, true);

      // Clear selection
      setSelectedImages(new Set());

      // Switch to another image if the current one was deleted
      if (selectedIds.includes(currentImageId) && updatedImages.length > 0) {
        // Safely select the first available image
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.set("image", updatedImages[0].id);
        params.set("page", "1"); // Reset to first page
        router.replace(`?${params.toString()}`, { scroll: false });
      }

      // Force a refresh of data from server to ensure consistency
      if (onImagesChange) {
        console.log("Requesting server refresh after deletion");
        // Wait a moment to ensure server processing completes
        setTimeout(() => {
          // Pass updatedImages to maintain state consistency until server refresh completes
          onImagesChange(updatedImages);
        }, 1000);
      }
    } catch (error) {
      console.error("Error during image deletion:", error);
      // Revert optimistic update if deletion failed
      if (onImagesChange) {
        console.log("Error occurred - forcing refresh from server");
        onImagesChange(images); // Pass original images to trigger full refresh
      }
    }
  }, [
    selectedImages,
    images,
    safeRemoveImage,
    currentImageId,
    router,
    searchParams,
    onImagesChange,
  ]);

  // Image selection handler
  const handleImageSelect = useCallback((imageId: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  }, []);

  // Image loading handler
  const handleImageLoad = useCallback((imageId: string) => {
    setLoadedImages((prev) => new Set([...prev, imageId]));
  }, []);

  // Handle copy to clipboard
  const handleCopy = useCallback((text: string, field: "filename" | "url") => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000); // Reset after 2 seconds
  }, []);

  // Image upload handler
  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return;

    console.log(`Starting upload of ${files.length} files`);
    setUploading(true);

    // Simple progress tracking
    const newProgress: ImageProgress[] = Array.from(files).map((file) => ({
      fileName: file.name,
      progress: 0,
      status: "uploading",
      currentStep: "Starting upload...",
    }));
    setUploadProgress(newProgress);

    // Process each file sequentially
    const newImages: ImageType[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Create a basic FormData
        const formData = new FormData();

        // First, verify the file is valid
        if (!file.size) {
          throw new Error("File is empty");
        }

        // Add the file
        formData.append("file", file);
        formData.append("carId", carId);

        // Add vehicleInfo if available
        if (vehicleInfo) {
          formData.append("vehicleInfo", JSON.stringify(vehicleInfo));
        }

        // Update progress
        setUploadProgress((prev) => {
          const updated = [...prev];
          if (updated[i]) {
            updated[i] = {
              ...updated[i],
              progress: 10,
              currentStep: "Uploading to server...",
            };
          }
          return updated;
        });

        // Use the Cloudflare image upload endpoint
        const response = await fetch(`/api/cloudflare/images`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Upload failed: ${response.status} - ${errorText.substring(0, 200)}`
          );
        }

        const result = await response.json();

        // Update progress
        setUploadProgress((prev) => {
          const updated = [...prev];
          if (updated[i]) {
            updated[i] = {
              ...updated[i],
              progress: 100,
              status: "complete",
              imageUrl: result.imageUrl,
              currentStep: "Complete",
            };
          }
          return updated;
        });

        // Add to new images
        newImages.push({
          id: result.imageId,
          url: result.imageUrl,
          filename: file.name,
          metadata: result.metadata || {},
          variants: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);

        // Show error in progress
        setUploadProgress((prev) => {
          const updated = [...prev];
          if (updated[i]) {
            updated[i] = {
              ...updated[i],
              status: "error",
              error: error.message || "Upload failed",
              currentStep: "Failed",
            };
          }
          return updated;
        });
      }
    }

    setUploading(false);

    // If we have new images, update the gallery
    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);

      if (onImagesChange) {
        onImagesChange(updatedImages);
      }
    }
  };

  // Pagination
  const paginatedImages = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredImages.slice(startIndex, endIndex);
  }, [filteredImages, currentPage]);

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);

  // Add the buttons at the top of the gallery
  const renderTopButtons = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <div>
          {!isEditMode && (
            <ImageFilterButton
              activeFilters={filters}
              filterOptions={filterOptions}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
            />
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={toggleEditMode}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isEditMode ? (
              <>
                <Eye className="w-4 h-4" />
                View Mode
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                Edit Mode
              </>
            )}
          </Button>
          {isEditMode && (
            <>
              <Button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                    fileInputRef.current.click();
                  }
                }}
                disabled={uploading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <UploadIcon className="w-4 h-4" />
                Upload
              </Button>
              <Button
                onClick={handleManualRefresh}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                onClick={handleDeleteSelected}
                disabled={selectedImages.size === 0}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedImages.size})
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, isModalOpen]);

  // Add this effect to force synchronization when edit mode changes
  useEffect(() => {
    // Only run this effect if the component is fully mounted
    if (!isMounted) return;

    // Check if we should prevent refresh
    if (localStorage.getItem("preventAutoRefresh") === "true") {
      console.log("Skipping automatic refresh due to prevention flag");
      return;
    }

    console.log(
      `Mode changed to: ${isEditMode ? "edit" : "view"} mode - syncing state`
    );

    // Debounce the refresh operation to prevent rapid consecutive calls
    const refreshTimer = setTimeout(() => {
      // When switching modes, only refresh if we have images and no prevention flag
      if (onImagesChange && images.length > 0) {
        console.log(
          "Mode changed: requesting selective image refresh from server"
        );
        // Use the current images to keep state consistent
        onImagesChange(images);
      }
    }, 300);

    return () => clearTimeout(refreshTimer);
  }, [isEditMode, isMounted, onImagesChange, images]);

  // Function to force a manual refresh - add timestamp parameter
  const handleManualRefresh = useCallback(() => {
    // Force server synchronization
    console.log("🔄 Manual refresh requested");
    if (onImagesChange) {
      // Generate a unique timestamp so the server recognizes this as a new request
      const timestamp = new Date().getTime();
      console.log(
        `🔄 Forcing complete server refresh with timestamp: ${timestamp}`
      );

      // Clear local state to ensure we don't have any old references
      setImages([]);
      setSelectedImages(new Set());
      setLoadedImages(new Set());

      // Pass empty array to force a complete refresh from parent
      onImagesChange([]);

      // Also reset pagination to first page
      if (currentPage !== 0) {
        handlePageChange(0);
      }

      // Set a timestamp in localStorage to ensure the server query is fresh
      localStorage.setItem("lastRefreshTimestamp", timestamp.toString());
    }
  }, [onImagesChange, currentPage, handlePageChange]);

  return (
    <div className="space-y-4">
      {renderTopButtons()}
      <div className="flex gap-6">
        {/* Main Image Display - Left Column */}
        <div className="w-2/3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-background-secondary">
            {images[mainIndex] && (
              <>
                {!loadedImages.has(images[mainIndex].id) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                <Image
                  src={`${images[mainIndex].url.replace(
                    /\/public$/,
                    ""
                  )}/public`}
                  alt={
                    images[mainIndex].metadata.description ||
                    `Image ${mainIndex + 1}`
                  }
                  fill
                  className="object-cover transition-opacity duration-300"
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  priority
                  onLoadingComplete={() =>
                    handleImageLoad(images[mainIndex].id)
                  }
                />
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  aria-label="View full size"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Image Metadata */}
          {images[mainIndex] && (
            <div className="mt-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-t border-border">
                    <td className="py-2 pr-4 text-muted-foreground w-24 font-semibold">
                      Filename
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center justify-between">
                        <span>{images[mainIndex].filename}</span>
                        <button
                          onClick={() =>
                            handleCopy(images[mainIndex].filename, "filename")
                          }
                          className="text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors flex items-center gap-1.5"
                        >
                          {copiedField === "filename" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-success" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="py-2 pr-4 text-muted-foreground font-semibold">
                      URL
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center justify-between">
                        <span className="truncate">
                          {images[mainIndex].url}
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(images[mainIndex].url, "url")
                          }
                          className="text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors ml-2 flex-shrink-0 flex items-center gap-1.5"
                        >
                          {copiedField === "url" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-success" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {images[mainIndex].metadata?.description && (
                    <tr className="border-t border-border">
                      <td className="py-2 pr-4 text-muted-foreground align-top font-semibold">
                        Description
                      </td>
                      <td className="py-2">
                        {images[mainIndex].metadata.description}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Thumbnails Grid - Right Column */}
        <div className="w-1/3">
          <div className="grid grid-cols-3 gap-2">
            {paginatedImages.map(
              (image, index) =>
                index < 15 && (
                  <div
                    key={image.id}
                    className={cn(
                      "relative aspect-[4/3] group",
                      isEditMode && "cursor-pointer"
                    )}
                  >
                    <Image
                      src={`${image.url.replace(/\/public$/, "")}/public`}
                      alt={image.metadata.description || `Thumbnail`}
                      fill
                      className={cn(
                        "object-cover rounded-md transition-all duration-200",
                        image.id === currentImageId
                          ? "opacity-100"
                          : "opacity-60 hover:opacity-100",
                        selectedImages.has(image.id) &&
                          "ring-2 ring-destructive"
                      )}
                      sizes="(max-width: 768px) 25vw, 200px"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent event bubbling
                        if (isEditMode) {
                          // In edit mode, we toggle selection of this specific image only
                          handleImageSelect(image.id);
                        } else {
                          setMainImage(image.id);
                        }
                      }}
                    />
                    {isEditMode && onPrimaryImageChange && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPrimaryImageChange(image.id);
                        }}
                        className={cn(
                          "absolute bottom-2 right-2 p-1.5 rounded-full transition-colors",
                          primaryImageId === image.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-black/50 text-white hover:bg-black/70"
                        )}
                        title={
                          primaryImageId === image.id
                            ? "Current featured image"
                            : "Set as featured image"
                        }
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
            )}
          </div>

          {/* File input for uploads */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const fileList = e.target.files;
              if (fileList && fileList.length > 0) {
                handleImageUpload(fileList);
              }
            }}
            className="hidden"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-4">
              <button
                onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() =>
                  handlePageChange(Math.min(totalPages - 1, currentPage + 1))
                }
                disabled={currentPage === totalPages - 1}
                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Upload progress indicator */}
          {uploading && (
            <div className="mt-4 p-3 bg-background border border-border rounded-md">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading images...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isModalOpen && images[mainIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <Image
            src={`${images[mainIndex].url.replace(/\/public$/, "")}/public`}
            alt={
              images[mainIndex].metadata.description ||
              `Full size image ${mainIndex + 1}`
            }
            className="max-w-[90vw] max-h-[90vh] object-contain"
            width={1920}
            height={1080}
            priority
          />
          <button
            onClick={handlePrev}
            className="absolute left-4 p-2 text-white hover:text-gray-300 transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 p-2 text-white hover:text-gray-300 transition-colors"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}

      {/* Upload progress indicators */}
      {uploadProgress.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {uploadProgress.map((progress, index) => (
            <div
              key={index}
              className="bg-background border border-border-primary rounded-lg p-4 shadow-lg max-w-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium truncate">
                  {progress.fileName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {progress.currentStep}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              {progress.error && (
                <p className="text-xs text-destructive mt-1">
                  {progress.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
