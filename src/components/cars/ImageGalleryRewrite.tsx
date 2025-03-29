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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { transformImageUrl } from "@/lib/imageTransform";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ImageFilterButton } from "@/components/cars/ImageGalleryEnhanced";

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
  onRemoveImage: (indices: number[], isMultiple?: boolean) => void;
  onImagesChange?: (images: ImageType[]) => void;
  onPrimaryImageChange?: (imageId: string) => void;
  showFilters?: boolean;
  vehicleInfo?: any;
  carId: string;
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

  // Local UI state only
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(
    urlPage ? parseInt(urlPage) - 1 : 0
  );
  const [filters, setFilters] = useState<FilterState>({});
  const [uploadProgress, setUploadProgress] = useState<ImageProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 15; // 3 columns x 5 rows
  const [images, setImages] = useState<ImageType[]>(initialImages);
  const [copiedField, setCopiedField] = useState<"filename" | "url" | null>(
    null
  );

  // Update images when initialImages changes
  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  // Extract available filter values from all images
  const filterOptions = useMemo(() => {
    const options = {
      angles: new Set<string>(),
      views: new Set<string>(),
      movements: new Set<string>(),
      tods: new Set<string>(),
      sides: new Set<string>(),
    };

    images.forEach((image) => {
      const { metadata } = image;
      if (metadata.angle?.trim()) options.angles.add(metadata.angle.trim());
      if (metadata.view?.trim()) options.views.add(metadata.view.trim());
      if (metadata.movement?.trim())
        options.movements.add(metadata.movement.trim());
      if (metadata.tod?.trim()) options.tods.add(metadata.tod.trim());
      if (metadata.side?.trim()) options.sides.add(metadata.side.trim());
    });

    return {
      angles: Array.from(options.angles).sort(),
      views: Array.from(options.views).sort(),
      movements: Array.from(options.movements).sort(),
      tods: Array.from(options.tods).sort(),
      sides: Array.from(options.sides).sort(),
    };
  }, [images]);

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

  // Remove the effect that updates page on mainIndex change
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    const hasIrrelevantParams = ["pageSize", "view", "edit", "search"].some(
      (param) => params.has(param)
    );

    if (hasIrrelevantParams) {
      // Keep only relevant parameters (mode, image, and page)
      const relevantParams = new URLSearchParams();
      if (params.has("mode")) relevantParams.set("mode", params.get("mode")!);
      if (params.has("image"))
        relevantParams.set("image", params.get("image")!);
      if (params.has("page")) relevantParams.set("page", params.get("page")!);

      const queryString = relevantParams.toString();
      const newUrl = queryString ? `?${queryString}` : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [router, searchParams]);

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

  // Update setMainImage to handle page changes
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
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              const newMode = isEditMode ? undefined : "edit";
              const params = new URLSearchParams(
                searchParams?.toString() || ""
              );
              if (newMode) {
                params.set("mode", newMode);
              } else {
                params.delete("mode");
              }
              router.push(`?${params.toString()}`);
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-[hsl(var(--border))] dark:border-[hsl(var(--border))] rounded-md hover:bg-[hsl(var(--background))] dark:hover:bg-[hsl(var(--background))] bg-opacity-50 text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]"
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
          </button>
        </div>
      </div>
    );
  };

  // Pagination
  const paginatedImages = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredImages.slice(startIndex, endIndex);
  }, [filteredImages, currentPage]);

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);

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
    updateUrl({ mode: isEditMode ? null : "edit" });
  }, [isEditMode, updateUrl]);

  // Image loading handler
  const handleImageLoad = useCallback((imageId: string) => {
    setLoadedImages((prev) => new Set([...prev, imageId]));
  }, []);

  // Image upload handler
  const handleImageUpload = useCallback(
    async (files: FileList) => {
      setUploading(true);
      const newProgress: ImageProgress[] = Array.from(files).map((file) => ({
        fileName: file.name,
        progress: 0,
        status: "pending",
        currentStep: "Preparing upload...",
      }));
      setUploadProgress(newProgress);

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const formData = new FormData();
          formData.append("file", file);
          formData.append("carId", carId);
          if (vehicleInfo) {
            formData.append("vehicleInfo", JSON.stringify(vehicleInfo));
          }

          // Update progress for this file
          setUploadProgress((prev) => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              status: "uploading",
              progress: 0,
              currentStep: "Uploading...",
            };
            return updated;
          });

          // Upload the file
          const response = await fetch("/api/cloudflare/images", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          const result = await response.json();

          // Update progress for successful upload
          setUploadProgress((prev) => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              status: "complete",
              progress: 100,
              imageUrl: result.url,
              currentStep: "Upload complete",
            };
            return updated;
          });

          // Add the new image to the gallery
          if (onImagesChange) {
            setImages((prev) => [...prev, result]);
            onImagesChange([...images, result]);
          }
        }
      } catch (error) {
        console.error("Upload error:", error);
        // Update progress to show error
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.status !== "complete"
              ? {
                  ...p,
                  status: "error",
                  progress: 0,
                  error: "Upload failed",
                  currentStep: "Error",
                }
              : p
          )
        );
      } finally {
        setUploading(false);
        // Clear progress after a delay
        setTimeout(() => {
          setUploadProgress([]);
        }, 3000);
      }
    },
    [carId, vehicleInfo, images, onImagesChange]
  );

  // Selection handlers
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

  const handleDeleteSelected = useCallback(() => {
    const selectedIndices = Array.from(selectedImages)
      .map((id) => images.findIndex((img) => img.id === id))
      .filter((index) => index !== -1);

    onRemoveImage(selectedIndices, true);
    setSelectedImages(new Set());
  }, [selectedImages, images, onRemoveImage]);

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

  // Add copy handler
  const handleCopy = useCallback((text: string, field: "filename" | "url") => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000); // Reset after 2 seconds
  }, []);

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
          {isEditMode && selectedImages.size > 0 && (
            <div className="mb-4 flex items-center gap-2 justify-end">
              <span className="text-sm text-muted-foreground">
                {selectedImages.size} selected
              </span>
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </div>
          )}

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
                      onClick={() => {
                        if (isEditMode) {
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

          {/* Upload Button */}
          {isEditMode && (
            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  e.target.files && handleImageUpload(e.target.files)
                }
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full px-4 py-2 text-sm border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  "Upload Images"
                )}
              </button>
            </div>
          )}

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
