import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
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
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { transformImageUrl } from "@/lib/imageTransform";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  useCarImages,
  useUploadImages,
  useDeleteImages,
  useSetPrimaryImage,
  ImageType,
  ImageProgress,
} from "@/lib/hooks/query/useImages";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getFormattedImageUrl } from "@/lib/cloudflare";
import { StatusNotification } from "@/components/StatusNotification";
import { ProgressItem } from "@/components/ui/UploadProgressTracking";

interface FilterState {
  angle?: string;
  view?: string;
  movement?: string;
  tod?: string;
  side?: string;
}

interface ImageGalleryWithQueryProps {
  carId: string;
  showFilters?: boolean;
  vehicleInfo?: any;
  onFilterOptionsChange?: (options: Record<string, string[]>) => void;
  onUploadStarted?: () => void;
  onUploadEnded?: () => void;
}

// Extend the ImageType to include _id for backward compatibility
interface ExtendedImageType extends ImageType {
  _id?: string;
  cloudflareId?: string;
}

export function ImageGalleryWithQuery({
  carId,
  showFilters,
  vehicleInfo,
  onFilterOptionsChange,
  onUploadStarted,
  onUploadEnded,
}: ImageGalleryWithQueryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // URL-based state
  const isEditMode = searchParams?.get("mode") === "edit";
  const urlPage = searchParams?.get("page");

  // React Query hooks
  const { data: images = [], isLoading, error, refetch } = useCarImages(carId);
  const uploadMutation = useUploadImages(carId, vehicleInfo);
  const deleteMutation = useDeleteImages(carId, queryClient);
  const setPrimaryMutation = useSetPrimaryImage(carId);

  // Core state - simplified
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
  const [loadingImageIds, setLoadingImageIds] = useState<Set<string>>(
    new Set()
  );
  const [uploadProgress, setUploadProgress] = useState<ImageProgress[]>([]);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLoadingRef = useRef(false);
  const isMountedRef = useRef(true);
  const loadedImageDetailsRef = useRef(new Set<string>());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleImageError = useCallback(
    (imageId: string) => {
      if (!isMountedRef.current) return;
      console.error(`Failed to load image: ${imageId}`);
      setLoadedImages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    },
    [isMountedRef]
  );

  // Memoized values
  const currentImageId = useMemo(() => {
    return searchParams?.get("image") || images[0]?.id;
  }, [searchParams, images]);

  const primaryImageId = useMemo(() => {
    return images.find((img: ExtendedImageType) => img.id === currentImageId)
      ?.id;
  }, [images, currentImageId]);

  const itemsPerPage = 15; // 3 columns x 5 rows for thumbnails

  // Memoized callbacks
  const loadImageDetails = useCallback(
    async (imageId: string) => {
      if (
        !imageId ||
        !isMountedRef.current ||
        isLoadingRef.current ||
        loadingImageIds.has(imageId) ||
        loadedImageDetailsRef.current.has(imageId)
      )
        return;

      try {
        isLoadingRef.current = true;
        setLoadingImageIds((prev) => new Set([...prev, imageId]));

        const response = await fetch(`/api/images/${imageId}`);
        if (!isMountedRef.current) return;

        if (response.ok) {
          const imageData = await response.json();
          if (!isMountedRef.current) return;

          // Update the query data without triggering a refetch
          queryClient.setQueryData(
            ["carImages", carId],
            (oldData: any[] = []) => {
              if (!Array.isArray(oldData)) return oldData;
              return oldData.map((img) =>
                img._id === imageId || img.id === imageId
                  ? {
                      ...img,
                      ...imageData,
                      url: getFormattedImageUrl(imageData.url),
                      id: imageData.id || imageData._id,
                      _id: imageData._id || imageData.id,
                    }
                  : img
              );
            }
          );

          // Mark this image as having its details loaded
          loadedImageDetailsRef.current.add(imageId);
        }
      } catch (error) {
        console.error(`Failed to load image details for ${imageId}:`, error);
      } finally {
        if (isMountedRef.current) {
          isLoadingRef.current = false;
          setLoadingImageIds((prev) => {
            const newSet = new Set([...prev]);
            newSet.delete(imageId);
            return newSet;
          });
        }
      }
    },
    [carId, queryClient]
  );

  // Load initial images
  useEffect(() => {
    if (!images || images.length === 0 || !isMountedRef.current) return;

    const imagesToLoad = images
      .filter(
        (img: ExtendedImageType) =>
          !img.url &&
          (img._id || img.id) &&
          !loadedImageDetailsRef.current.has(img._id || img.id)
      )
      .slice(0, 5);

    // Use Promise.all to load images in parallel and prevent multiple state updates
    Promise.all(
      imagesToLoad.map((img: ExtendedImageType) => {
        if (isMountedRef.current) {
          return loadImageDetails(img._id || img.id);
        }
      })
    ).catch(console.error);
  }, [images, loadImageDetails]);

  // Load current image if needed
  useEffect(() => {
    if (!currentImageId || !images.length || !isMountedRef.current) return;

    const currentImage = images.find(
      (img: ExtendedImageType) =>
        img.id === currentImageId || img._id === currentImageId
    );

    if (
      currentImage &&
      !currentImage.url &&
      isMountedRef.current &&
      !loadedImageDetailsRef.current.has(currentImageId)
    ) {
      loadImageDetails(currentImageId);
    }
  }, [currentImageId, images, loadImageDetails]);

  // Helper to check if an image is loading its details
  const isLoadingImageDetails = useCallback(
    (imageId: string) => {
      return loadingImageIds.has(imageId);
    },
    [loadingImageIds]
  );

  // Extract filter options from images
  useEffect(() => {
    if (!images.length || !isMountedRef.current) return;

    const options = {
      angles: new Set<string>(),
      views: new Set<string>(),
      movements: new Set<string>(),
      tods: new Set<string>(),
      sides: new Set<string>(),
    };

    images.forEach((image: ExtendedImageType) => {
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

    if (isMountedRef.current) {
      setFilterOptions(newFilterOptions);
      if (onFilterOptionsChange) {
        onFilterOptionsChange(newFilterOptions);
      }
    }
  }, [images, onFilterOptionsChange]);

  // Filter images based on selected filters
  const filteredImages = useMemo(() => {
    return images.filter((image: ExtendedImageType) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return image.metadata?.[key as keyof typeof image.metadata] === value;
      });
    });
  }, [images, filters]);

  // Derived state
  const mainIndex = useMemo(() => {
    const index = filteredImages.findIndex(
      (img: ExtendedImageType) => img.id === currentImageId
    );
    return index >= 0 ? index : 0;
  }, [filteredImages, currentImageId]);

  // Memoized handlers
  const handlePageChange = useCallback(
    (newPage: number) => {
      if (!isMountedRef.current) return;
      setCurrentPage(newPage);
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("page", (newPage + 1).toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handlePrev = useCallback(() => {
    if (!isMountedRef.current) return;
    const prevIndex =
      (mainIndex - 1 + filteredImages.length) % filteredImages.length;
    const targetPage = Math.floor(prevIndex / itemsPerPage);

    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("image", filteredImages[prevIndex].id);
    params.set("page", (targetPage + 1).toString());
    router.replace(`?${params.toString()}`, { scroll: false });

    setCurrentPage(targetPage);
  }, [mainIndex, filteredImages, itemsPerPage, searchParams, router]);

  const handleNext = useCallback(() => {
    if (!isMountedRef.current) return;
    const nextIndex = (mainIndex + 1) % filteredImages.length;
    const targetPage = Math.floor(nextIndex / itemsPerPage);

    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("image", filteredImages[nextIndex].id);
    params.set("page", (targetPage + 1).toString());
    router.replace(`?${params.toString()}`, { scroll: false });

    setCurrentPage(targetPage);
  }, [mainIndex, filteredImages, itemsPerPage, searchParams, router]);

  const setMainImage = useCallback(
    (imageId: string) => {
      if (!isMountedRef.current) return;
      const imageIndex = filteredImages.findIndex(
        (img: ExtendedImageType) => img.id === imageId
      );
      if (imageIndex >= 0) {
        const targetPage = Math.floor(imageIndex / itemsPerPage);

        const params = new URLSearchParams(searchParams?.toString() || "");
        params.set("image", imageId);
        params.set("page", (targetPage + 1).toString());
        router.replace(`?${params.toString()}`, { scroll: false });

        setCurrentPage(targetPage);
      }
    },
    [filteredImages, itemsPerPage, searchParams, router]
  );

  const handleFilterChange = useCallback(
    (type: string, value: string) => {
      if (!isMountedRef.current) return;
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
    },
    [handlePageChange]
  );

  const handleResetFilters = useCallback(() => {
    if (!isMountedRef.current) return;
    handlePageChange(0);
    setFilters({});
  }, [handlePageChange]);

  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      if (!isMountedRef.current) return;
      const params = new URLSearchParams(searchParams?.toString() || "");

      const irrelevantParams = ["page", "pageSize", "view", "edit", "search"];
      irrelevantParams.forEach((param) => params.delete(param));

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const queryString = params.toString();
      const newUrl = queryString ? `?${queryString}` : window.location.pathname;

      router.replace(newUrl, { scroll: false });
    },
    [searchParams, router]
  );

  const toggleEditMode = useCallback(() => {
    if (!isMountedRef.current) return;
    updateUrl({ mode: isEditMode ? null : "edit" });
  }, [isEditMode, updateUrl]);

  // Toast helper
  const showToast = useCallback(
    (
      toast: any,
      title: string,
      description: string,
      duration = 2000,
      variant?: "default" | "destructive"
    ) => {
      if (!isMountedRef.current) return;
      toast({
        title,
        description,
        duration,
        variant,
      });
    },
    []
  );

  // Handle delete selection using React Query mutation
  const handleDeleteSelected = useCallback(async () => {
    if (!isMountedRef.current) return;
    const selectedArray = Array.from(selectedImages);

    if (selectedArray.length === 0) {
      showToast(toast, "Error", "No images selected", 2000, "destructive");
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        imageIds: selectedArray,
        deleteFromStorage: true,
      });
      if (isMountedRef.current) {
        setSelectedImages(new Set());
        showToast(toast, "Success", "Images deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting images:", error);
      if (isMountedRef.current) {
        showToast(
          toast,
          "Error",
          "Failed to delete images",
          2000,
          "destructive"
        );
      }
    }
  }, [selectedImages, deleteMutation, toast, showToast]);

  // Handle image loading
  const handleImageLoad = useCallback((imageId: string) => {
    if (!isMountedRef.current) return;
    setLoadedImages((prev) => new Set([...prev, imageId]));
  }, []);

  // Handle image selection
  const toggleImageSelection = useCallback((imageId: string) => {
    if (!isMountedRef.current) return;
    setSelectedImages((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(imageId)) {
        newSelection.delete(imageId);
      } else {
        newSelection.add(imageId);
      }
      return newSelection;
    });
  }, []);

  // Handle copy to clipboard
  const handleCopy = useCallback(
    (text: string, field: "filename" | "url") => {
      if (!isMountedRef.current) return;
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => {
        if (isMountedRef.current) {
          setCopiedField(null);
        }
      }, 2000);
      showToast(toast, "Copied!", "Image URL copied to clipboard");
    },
    [toast, showToast]
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (!isMountedRef.current || !files.length) return;

      try {
        if (onUploadStarted) onUploadStarted();
        setShowUploadProgress(true);

        await uploadMutation.mutateAsync({
          files: Array.from(files),
          onProgress: (progress) => {
            if (isMountedRef.current) {
              setUploadProgress(progress);
            }
          },
        });

        // Don't call refetch here, the cache is already updated
        if (isMountedRef.current) {
          setUploadProgress([]);
          setShowUploadProgress(false);
          if (onUploadEnded) onUploadEnded();
          showToast(toast, "Success", "Images uploaded successfully");
        }
      } catch (error) {
        console.error("Error uploading files:", error);
        if (isMountedRef.current) {
          setUploadProgress([]);
          setShowUploadProgress(false);
          if (onUploadEnded) onUploadEnded();
          showToast(
            toast,
            "Error",
            "Failed to upload images",
            2000,
            "destructive"
          );
        }
      }
    },
    [uploadMutation, onUploadStarted, onUploadEnded, toast, showToast]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isMountedRef.current || !event.target.files?.length) return;
      handleFileUpload(event.target.files);
      event.target.value = "";
    },
    [handleFileUpload]
  );

  // Handle file drop
  const handleFileDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!isMountedRef.current) return;
      event.preventDefault();
      event.stopPropagation();

      const files = event.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload]
  );

  // Handle drag over
  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  // Handle set primary image
  const handleSetPrimaryImage = useCallback(
    async (imageId: string) => {
      if (!isMountedRef.current) return;
      try {
        await setPrimaryMutation.mutateAsync(imageId);
        if (isMountedRef.current) {
          showToast(toast, "Success", "Primary image updated");
        }
      } catch (error) {
        console.error("Error setting primary image:", error);
        if (isMountedRef.current) {
          showToast(
            toast,
            "Error",
            "Failed to update primary image",
            2000,
            "destructive"
          );
        }
      }
    },
    [setPrimaryMutation, toast, showToast]
  );

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
                disabled={uploadMutation.isPending}
                variant="outline"
                className="flex items-center gap-2"
              >
                <UploadIcon className="w-4 h-4" />
                Upload
              </Button>
              <Button
                onClick={handleDeleteSelected}
                disabled={selectedImages.size === 0 || deleteMutation.isPending}
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-destructive p-4 border border-destructive/20 rounded-md bg-destructive/10">
        Error loading images: {(error as Error).message}
      </div>
    );
  }

  // Empty state
  if (images.length === 0) {
    return (
      <div className="relative p-8 text-center border border-border rounded-md bg-muted/10">
        <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No images found</h3>
        <p className="text-muted-foreground mb-4">
          Add images to this car to see them here.
        </p>
        <Button
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
              fileInputRef.current.click();
            }
          }}
          className="inline-flex items-center gap-2"
        >
          <UploadIcon className="w-4 h-4" />
          Upload Images
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              // Set status visibility BEFORE calling the upload function
              setShowUploadProgress(true);
              handleFileUpload(e.target.files);
            }
          }}
        />

        {/* Always include StatusNotification in DOM for empty state too */}
        <StatusNotification
          show={showUploadProgress || uploadMutation.isPending}
          uploadProgress={uploadProgress as any}
          deleteStatus={[]}
          uploading={uploadMutation.isPending}
          isDeleting={false}
          onClose={() => {
            if (!uploadMutation.isPending) {
              setShowUploadProgress(false);
            }
          }}
          clearNotifications={() => {
            if (!uploadMutation.isPending) {
              setUploadProgress([]);
              setShowUploadProgress(false);
            }
          }}
        />
      </div>
    );
  }

  // Render the main image section
  const renderMainImage = () => {
    // If no filtered images are available, show empty state
    if (filteredImages.length === 0) {
      return (
        <div className="relative h-64 w-full bg-muted flex items-center justify-center">
          <span className="text-muted-foreground">No images available</span>
        </div>
      );
    }

    // Get current image
    const currentImage = filteredImages[mainIndex];
    if (!currentImage) {
      return (
        <div className="relative h-64 w-full bg-muted flex items-center justify-center">
          <span className="text-muted-foreground">Image not found</span>
        </div>
      );
    }

    const isLoading =
      isLoadingImageDetails(currentImage.id) || !currentImage.url;

    return (
      <div
        className="w-full"
        style={{
          marginLeft: 0,
          marginRight: 0,
          paddingLeft: 0,
          paddingRight: 0,
        }}
      >
        <div
          className="relative w-full"
          style={{
            minHeight: "400px",
            margin: 0,
            padding: 0,
            height: "calc(100vh - 400px)",
            maxHeight: "700px",
          }}
        >
          {/* Loading state */}
          {(isLoading || !loadedImages.has(currentImage.id)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Image */}
          {currentImage.url && (
            <div
              className="w-full h-full flex justify-center items-start"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <Image
                src={currentImage.url}
                alt={
                  currentImage.metadata?.description || `Image ${mainIndex + 1}`
                }
                fill
                className={cn(
                  "object-contain transition-opacity duration-300",
                  {
                    "opacity-0": !loadedImages.has(currentImage.id),
                    "opacity-100": loadedImages.has(currentImage.id),
                  }
                )}
                sizes="66vw"
                priority
                onLoad={() => handleImageLoad(currentImage.id)}
                onError={() => handleImageError(currentImage.id)}
              />
            </div>
          )}

          {/* Controls */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors z-20"
            aria-label="View full size"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors z-20"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors z-20"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Image information */}
        {currentImage && (
          <div className="text-sm mt-4">
            {/* Description (shown above filename/URL) */}
            {currentImage.metadata?.description && (
              <div className="mb-3 bg-muted/40 p-3 rounded text-muted-foreground">
                {currentImage.metadata.description}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Add modal for fullscreen view
  const renderFullscreenModal = () => {
    if (!isModalOpen || !filteredImages[mainIndex]) return null;

    const currentImage = filteredImages[mainIndex];

    return (
      <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center animate-in fade-in-0">
        <div className="absolute inset-0 backdrop-blur-sm" />

        <div className="relative z-10 w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-medium truncate">
              {currentImage.filename || `Image ${mainIndex + 1}`}
            </h2>
            <Button
              onClick={() => setIsModalOpen(false)}
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Image container */}
          <div className="relative flex-grow bg-black/50 flex items-center justify-center overflow-hidden">
            {!loadedImages.has(currentImage.id) ? (
              <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
            ) : (
              <img
                src={`${currentImage.url.replace(/\/public$/, "")}/public`}
                alt={
                  currentImage.metadata?.description || `Image ${mainIndex + 1}`
                }
                className="max-w-full max-h-full object-contain"
                onLoad={() => handleImageLoad(currentImage.id)}
              />
            )}

            {/* Navigation controls */}
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Image metadata */}
          {currentImage.metadata && (
            <div className="p-4 bg-background border-t text-sm overflow-y-auto max-h-[30vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Image Details</h3>
                  <dl className="grid grid-cols-[120px_1fr] gap-y-1.5">
                    {currentImage.metadata.angle && (
                      <>
                        <dt className="text-muted-foreground">Angle:</dt>
                        <dd>{currentImage.metadata.angle}</dd>
                      </>
                    )}
                    {currentImage.metadata.view && (
                      <>
                        <dt className="text-muted-foreground">View:</dt>
                        <dd>{currentImage.metadata.view}</dd>
                      </>
                    )}
                    {currentImage.metadata.movement && (
                      <>
                        <dt className="text-muted-foreground">Movement:</dt>
                        <dd>{currentImage.metadata.movement}</dd>
                      </>
                    )}
                    {currentImage.metadata.tod && (
                      <>
                        <dt className="text-muted-foreground">Time of Day:</dt>
                        <dd>{currentImage.metadata.tod}</dd>
                      </>
                    )}
                    {currentImage.metadata.side && (
                      <>
                        <dt className="text-muted-foreground">Side:</dt>
                        <dd>{currentImage.metadata.side}</dd>
                      </>
                    )}
                  </dl>
                </div>

                {currentImage.metadata.description && (
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-sm">
                      {currentImage.metadata.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Fix the handling of possibly undefined cloudflareId
  const handleSelectedImageCheck = (image: ExtendedImageType) => {
    return (
      !selectedImages.has(image.id) &&
      !(image.cloudflareId && selectedImages.has(image.cloudflareId))
    );
  };

  // Then use it in the code where the error occurs
  const remainingImages = images.filter(handleSelectedImageCheck);

  // Update the main component return
  return (
    <div className="space-y-4">
      {renderTopButtons()}

      <div className="flex">
        {/* Main image on the left - 2/3 width with no margins */}
        <div className="w-2/3" style={{ paddingRight: 0 }}>
          {renderMainImage()}
        </div>

        {/* Thumbnails on the right - 1/3 width */}
        <div className="w-1/3 pl-6">
          <div className="bg-background rounded-lg p-2">
            {/* Empty state if no images after filtering */}
            {filteredImages.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No images match your filter criteria
              </div>
            ) : (
              <>
                {/* 3x5 grid of thumbnails */}
                <div className="grid grid-cols-3 gap-2">
                  {paginatedImages.map((image: any) => {
                    const isLoading =
                      isLoadingImageDetails(image.id) || !image.url;
                    const isActive = filteredImages[mainIndex]?.id === image.id;
                    const isPrimary = image.id === primaryImageId;

                    return (
                      <div
                        key={image.id}
                        className={cn(
                          "relative cursor-pointer rounded-md overflow-hidden aspect-[4/3] bg-muted group",
                          {
                            "ring-2 ring-primary ring-offset-1": isActive,
                            "opacity-60": !isActive && !isEditMode, // Non-active thumbnails at 60% opacity
                            "opacity-70":
                              isEditMode && selectedImages.has(image.id), // Selected thumbnails in edit mode
                          }
                        )}
                        onClick={() => setMainImage(image.id)}
                      >
                        {/* Loading state */}
                        {(isLoading || !loadedImages.has(image.id)) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        )}

                        {/* Image */}
                        {image.url && (
                          <Image
                            src={`${image.url.replace(/\/public$/, "")}/public`}
                            alt={image.metadata?.description || `Thumbnail`}
                            fill
                            className={cn(
                              "object-cover transition-opacity duration-300",
                              {
                                "opacity-0": !loadedImages.has(image.id),
                                "opacity-100": loadedImages.has(image.id),
                              }
                            )}
                            sizes="(max-width: 768px) 100px, 120px"
                            onLoad={() => handleImageLoad(image.id)}
                          />
                        )}

                        {/* Edit mode controls */}
                        {isEditMode && (
                          <>
                            {/* Set primary button - small, in corner */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetPrimaryImage(image.id);
                              }}
                              className={cn(
                                "absolute bottom-1 right-1 p-1 rounded-full z-20 transition-colors",
                                isPrimary
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-black/50 text-white hover:bg-black/70"
                              )}
                              title={
                                isPrimary
                                  ? "Current primary image"
                                  : "Set as primary image"
                              }
                            >
                              <ImageIcon className="w-3 h-3" />
                            </button>

                            {/* Selection overlay for edit mode */}
                            <div
                              className={cn(
                                "absolute inset-0 flex items-center justify-center transition-opacity",
                                {
                                  "opacity-100 bg-black/50": selectedImages.has(
                                    image.id
                                  ),
                                  "opacity-0 bg-black/0 group-hover:opacity-100 group-hover:bg-black/30":
                                    !selectedImages.has(image.id),
                                }
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleImageSelection(image.id);
                              }}
                            >
                              <CheckCircle
                                className={cn("w-6 h-6 text-white", {
                                  "opacity-100": selectedImages.has(image.id),
                                  "opacity-0 group-hover:opacity-100":
                                    !selectedImages.has(image.id),
                                })}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-2 mt-4">
                    <div className="flex justify-center items-center gap-2">
                      <Button
                        onClick={() =>
                          handlePageChange(Math.max(0, currentPage - 1))
                        }
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 0}
                        className="h-7 w-7 p-0"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-xs">
                        {currentPage + 1}/{totalPages}
                      </span>
                      <Button
                        onClick={() =>
                          handlePageChange(
                            Math.min(totalPages - 1, currentPage + 1)
                          )
                        }
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages - 1}
                        className="h-7 w-7 p-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                    {totalPages > 5 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Showing page {currentPage + 1} of {totalPages}
                        <Button
                          onClick={() => refetch()}
                          variant="link"
                          size="sm"
                          className="h-6 px-2 text-xs"
                        >
                          Refresh Images
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const fileList = e.target.files;
          if (fileList && fileList.length > 0) {
            handleFileUpload(fileList);
          }
        }}
        className="hidden"
      />

      {/* ALWAYS render the StatusNotification component, but conditionally show it */}
      <StatusNotification
        show={showUploadProgress || uploadMutation.isPending}
        uploadProgress={uploadProgress as any} // Cast to any to avoid type issues
        deleteStatus={[]}
        uploading={uploadMutation.isPending}
        isDeleting={false}
        onClose={() => {
          // Only allow closing if not currently uploading
          if (!uploadMutation.isPending) {
            setShowUploadProgress(false);
          }
        }}
        clearNotifications={() => {
          // Only allow clearing if not currently uploading
          if (!uploadMutation.isPending) {
            setUploadProgress([]);
            setShowUploadProgress(false);
            // Force a refresh of the images after uploads
            refetch();
          }
        }}
      />

      {/* Fullscreen image modal */}
      {renderFullscreenModal()}
    </div>
  );
}

// Add the ImageFilterButton component
// Export the filter button to be used in the parent component
export const ImageFilterButton = React.memo(function ImageFilterButton({
  activeFilters,
  filterOptions,
  onFilterChange,
  onResetFilters,
}: {
  activeFilters: any;
  filterOptions: any;
  onFilterChange: (type: string, value: string) => void;
  onResetFilters: () => void;
}) {
  // Control the open state of the popover manually
  const [open, setOpen] = React.useState(false);

  // Handle filter change without causing multiple renders
  const handleFilterChange = React.useCallback(
    (type: string, value: string) => {
      onFilterChange(type, value);
    },
    [onFilterChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-[hsl(var(--border))] rounded-md hover:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))]">
          <Filter className="w-4 h-4" />
          Filter
          {Object.keys(activeFilters).length > 0 && (
            <span className="flex items-center justify-center w-5 h-5 text-xs rounded-full bg-primary text-primary-foreground">
              {Object.keys(activeFilters).length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 max-h-96 overflow-y-auto bg-[hsl(var(--background))] border border-[hsl(var(--border))] shadow-md">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Filter Images</h3>
            {Object.keys(activeFilters).length > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onResetFilters();
                }}
                className="text-xs text-primary hover:text-primary/90 transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>

          {filterOptions.angles && filterOptions.angles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
                Angle
              </h3>
              <div className="flex flex-wrap gap-2">
                {filterOptions.angles.map((angle: string) => (
                  <button
                    key={angle}
                    onClick={(e) => {
                      e.preventDefault();
                      handleFilterChange("angle", angle);
                    }}
                    className={`px-3 py-1 text-xs rounded-full transition-colors duration-150 ease-in-out ${
                      activeFilters.angle === angle
                        ? "bg-[hsl(var(--background-primary))] text-[hsl(var(--foreground))]"
                        : "bg-[hsl(var(--background-muted))] text-[hsl(var(--foreground-muted))] hover:bg-[hsl(var(--background-subtle))] hover:text-[hsl(var(--foreground))]"
                    }`}
                  >
                    {angle}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filterOptions.views && filterOptions.views.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
                View
              </h3>
              <div className="flex flex-wrap gap-2">
                {filterOptions.views.map((view: string) => (
                  <button
                    key={view}
                    onClick={(e) => {
                      e.preventDefault();
                      handleFilterChange("view", view);
                    }}
                    className={`px-3 py-1 text-xs rounded-full transition-colors duration-150 ease-in-out ${
                      activeFilters.view === view
                        ? "bg-[hsl(var(--background-primary))] text-[hsl(var(--foreground))]"
                        : "bg-[hsl(var(--background-muted))] text-[hsl(var(--foreground-muted))] hover:bg-[hsl(var(--background-subtle))] hover:text-[hsl(var(--foreground))]"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filterOptions.movements && filterOptions.movements.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
                Movement
              </h3>
              <div className="flex flex-wrap gap-2">
                {filterOptions.movements.map((movement: string) => (
                  <button
                    key={movement}
                    onClick={(e) => {
                      e.preventDefault();
                      handleFilterChange("movement", movement);
                    }}
                    className={`px-3 py-1 text-xs rounded-full transition-colors duration-150 ease-in-out ${
                      activeFilters.movement === movement
                        ? "bg-[hsl(var(--background-primary))] text-[hsl(var(--foreground))]"
                        : "bg-[hsl(var(--background-muted))] text-[hsl(var(--foreground-muted))] hover:bg-[hsl(var(--background-subtle))] hover:text-[hsl(var(--foreground))]"
                    }`}
                  >
                    {movement}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filterOptions.tods && filterOptions.tods.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
                Time of Day
              </h3>
              <div className="flex flex-wrap gap-2">
                {filterOptions.tods.map((tod: string) => (
                  <button
                    key={tod}
                    onClick={(e) => {
                      e.preventDefault();
                      handleFilterChange("tod", tod);
                    }}
                    className={`px-3 py-1 text-xs rounded-full transition-colors duration-150 ease-in-out ${
                      activeFilters.tod === tod
                        ? "bg-[hsl(var(--background-primary))] text-[hsl(var(--foreground))]"
                        : "bg-[hsl(var(--background-muted))] text-[hsl(var(--foreground-muted))] hover:bg-[hsl(var(--background-subtle))] hover:text-[hsl(var(--foreground))]"
                    }`}
                  >
                    {tod}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filterOptions.sides && filterOptions.sides.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
                Side
              </h3>
              <div className="flex flex-wrap gap-2">
                {filterOptions.sides.map((side: string) => (
                  <button
                    key={side}
                    onClick={(e) => {
                      e.preventDefault();
                      handleFilterChange("side", side);
                    }}
                    className={`px-3 py-1 text-xs rounded-full transition-colors duration-150 ease-in-out ${
                      activeFilters.side === side
                        ? "bg-[hsl(var(--background-primary))] text-[hsl(var(--foreground))]"
                        : "bg-[hsl(var(--background-muted))] text-[hsl(var(--foreground-muted))] hover:bg-[hsl(var(--background-subtle))] hover:text-[hsl(var(--foreground))]"
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Debug info */}
          <div className="mt-4 pt-4 border-t border-[hsl(var(--border-subtle))]">
            <details>
              <summary className="text-xs text-[hsl(var(--foreground-muted))] cursor-pointer">
                Debug filter options
              </summary>
              <pre className="mt-2 p-2 bg-[hsl(var(--background-subtle))] rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(filterOptions, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});
