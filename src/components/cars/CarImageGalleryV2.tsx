"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FileInfoDisplay } from "../ui/FileInfoDisplay";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  X,
  Loader2,
  Info,
  Upload,
  Trash2,
  Search,
  Filter,
  Copy,
  Check,
  Pin,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Define the allowed values for each field
const allowedValues = {
  angle: [
    "front",
    "front 3/4",
    "side",
    "rear 3/4",
    "rear",
    "overhead",
    "under",
  ],
  view: ["exterior", "interior"],
  movement: ["static", "motion"],
  tod: ["sunrise", "day", "sunset", "night"],
  side: ["driver", "passenger", "rear", "overhead"],
} as const;

interface ImageData {
  _id: string;
  url: string;
  metadata?: {
    category?: string;
    description?: string;
    angle?: string;
    view?: string;
    movement?: string;
    tod?: string;
    side?: string;
    isPrimary?: boolean;
    [key: string]: any;
  };
  filename?: string;
}

interface UploadProgress {
  id: string;
  progress: number;
  status: "uploading" | "analyzing" | "complete" | "error";
  filename: string;
  error?: string;
}

interface CarImageGalleryV2Props {
  images: ImageData[];
  className?: string;
  thumbnailSize?: { width: number; height: number };
  fullSize?: { width: number; height: number };
  showCategoryTabs?: boolean;
  onImageClick?: (image: ImageData) => void;
  isLoading?: boolean;
  isEditing?: boolean;
  onUpload?: (files: File[]) => Promise<void>;
  onDelete?: (image: ImageData) => Promise<void>;
  onSetPrimary?: (image: ImageData) => void;
  onOpenUploadModal?: () => void;
}

const THUMBNAILS_PER_PAGE = 12;

export function CarImageGalleryV2({
  images = [],
  className = "",
  thumbnailSize = { width: 150, height: 100 },
  fullSize = { width: 800, height: 600 },
  showCategoryTabs = true,
  onImageClick,
  isLoading = false,
  isEditing = false,
  onUpload,
  onDelete,
  onSetPrimary,
  onOpenUploadModal,
}: CarImageGalleryV2Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);
  const [currentTab, setCurrentTab] = useState("all");
  const [selectedAngle, setSelectedAngle] = useState<string>("all");
  const [filteredImages, setFilteredImages] = useState<ImageData[]>(images);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedView, setSelectedView] = useState<string>("all");
  const [selectedMovement, setSelectedMovement] = useState<string>("all");
  const [selectedTod, setSelectedTod] = useState<string>("all");
  const [selectedSide, setSelectedSide] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Get current page and image from URL or default values
  const currentPage = Number(searchParams.get("page")) || 1;
  const currentImageId = searchParams.get("image");

  // Function to update URL with new page number and image ID
  const updateUrlState = useCallback(
    (newPage: number, imageId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", newPage.toString());
      params.set("image", imageId);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Function to find page number for a specific image
  const getPageForImage = useCallback(
    (image: ImageData) => {
      const imageIndex = filteredImages.findIndex(
        (img) => img._id === image._id
      );
      if (imageIndex === -1) return 1;
      return Math.floor(imageIndex / THUMBNAILS_PER_PAGE) + 1;
    },
    [filteredImages]
  );

  // Initialize selected image from URL or first image
  useEffect(() => {
    if (currentImageId) {
      const imageFromUrl = filteredImages.find(
        (img) => img._id === currentImageId
      );
      if (imageFromUrl) {
        setSelectedImage(imageFromUrl);
      }
    } else if (filteredImages.length > 0 && !selectedImage) {
      setSelectedImage(filteredImages[0]);
      updateUrlState(1, filteredImages[0]._id);
    }
  }, [currentImageId, filteredImages, selectedImage, updateUrlState]);

  useEffect(() => {
    let filtered = images;

    // Apply category filter
    if (currentTab !== "all") {
      filtered = filtered.filter(
        (img) => img.metadata?.category === currentTab
      );
    }

    // Apply angle filter
    if (selectedAngle !== "all") {
      filtered = filtered.filter(
        (img) => img.metadata?.angle === selectedAngle
      );
    }

    // Apply view filter
    if (selectedView !== "all") {
      filtered = filtered.filter((img) => img.metadata?.view === selectedView);
    }

    // Apply movement filter
    if (selectedMovement !== "all") {
      filtered = filtered.filter(
        (img) => img.metadata?.movement === selectedMovement
      );
    }

    // Apply time of day filter
    if (selectedTod !== "all") {
      filtered = filtered.filter((img) => img.metadata?.tod === selectedTod);
    }

    // Apply side filter
    if (selectedSide !== "all") {
      filtered = filtered.filter((img) => img.metadata?.side === selectedSide);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((img) => {
        const metadata = img.metadata || {};
        return (
          img.filename?.toLowerCase().includes(query) ||
          metadata.description?.toLowerCase().includes(query) ||
          metadata.category?.toLowerCase().includes(query) ||
          metadata.angle?.toLowerCase().includes(query) ||
          metadata.view?.toLowerCase().includes(query) ||
          metadata.movement?.toLowerCase().includes(query) ||
          metadata.tod?.toLowerCase().includes(query) ||
          metadata.side?.toLowerCase().includes(query)
        );
      });
    }

    setFilteredImages(filtered);
  }, [
    images,
    currentTab,
    selectedAngle,
    selectedView,
    selectedMovement,
    selectedTod,
    selectedSide,
    searchQuery,
  ]);

  // Separate effect for handling tab changes
  useEffect(() => {
    if (filteredImages.length > 0) {
      // Only reset selection if current selection is not in filtered images
      const currentImageStillValid = filteredImages.some(
        (img) => selectedImage && img._id === selectedImage._id
      );

      if (!currentImageStillValid) {
        const firstImage = filteredImages[0];
        setSelectedImage(firstImage);
        updateUrlState(1, firstImage._id);
      }
    }
  }, [filteredImages, selectedImage, updateUrlState]);

  const navigateImages = useCallback(
    (direction: "next" | "prev") => {
      if (!selectedImage || filteredImages.length === 0) return;

      const currentIndex = filteredImages.findIndex(
        (img) => img._id === selectedImage._id
      );
      if (currentIndex === -1) return;

      let newIndex;
      if (direction === "next") {
        newIndex = (currentIndex + 1) % filteredImages.length;
      } else {
        newIndex =
          (currentIndex - 1 + filteredImages.length) % filteredImages.length;
      }

      const newImage = filteredImages[newIndex];
      const newPage = getPageForImage(newImage);

      // Update both states together
      setSelectedImage(newImage);
      setMainImageLoaded(false);
      updateUrlState(newPage, newImage._id);
    },
    [filteredImages, selectedImage, getPageForImage, updateUrlState]
  );

  const handleThumbnailClick = useCallback(
    (image: ImageData) => {
      const newPage = getPageForImage(image);
      setSelectedImage(image);
      setMainImageLoaded(false);
      updateUrlState(newPage, image._id);
    },
    [getPageForImage, updateUrlState]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      // When changing pages, select the first image of the new page
      const startIndex = (newPage - 1) * THUMBNAILS_PER_PAGE;
      const newImage = filteredImages[startIndex];
      if (newImage) {
        setSelectedImage(newImage);
        updateUrlState(newPage, newImage._id);
      }
    },
    [filteredImages, updateUrlState]
  );

  const handleImageClick = (image: ImageData) => {
    setSelectedImage(image);
    if (onImageClick) {
      onImageClick(image);
    }
  };

  const handleZoomClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImage) {
      setShowImageDialog(true);
    }
  };

  const handleCloseDialog = () => {
    setShowImageDialog(false);
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredImages.length / THUMBNAILS_PER_PAGE);
  const startIndex = (currentPage - 1) * THUMBNAILS_PER_PAGE;
  const endIndex = startIndex + THUMBNAILS_PER_PAGE;
  const currentThumbnails = filteredImages.slice(startIndex, endIndex);

  // Extract unique categories from images
  const categories = [
    "all",
    ...Array.from(
      new Set(
        images.map((img) => img.metadata?.category).filter(Boolean) as string[]
      )
    ),
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showImageDialog) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          navigateImages("prev");
          break;
        case "ArrowRight":
          navigateImages("next");
          break;
        case "f":
        case "F":
          if (selectedImage) {
            e.preventDefault();
            setShowImageDialog(true);
          }
          break;
        case "Escape":
          if (showImageDialog) {
            setShowImageDialog(false);
          }
          break;
      }
    },
    [selectedImage, showImageDialog, navigateImages]
  );

  useEffect(() => {
    // Add keyboard event listener
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Reset loading state when selected image changes
  useEffect(() => {
    setMainImageLoaded(false);
  }, [selectedImage?.url]);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!onUpload || !event.target.files) return;

      const files = Array.from(event.target.files);

      // Don't process empty file selection
      if (files.length === 0) return;

      console.log(`Starting upload of ${files.length} files`);

      // Create initial progress tracking for all files
      const progressMap = new Map(
        files.map((file) => [
          file.name,
          {
            id: Math.random().toString(36).substr(2, 9),
            progress: 0,
            status: "uploading" as const,
            filename: file.name,
          },
        ])
      );

      setUploadProgress(Array.from(progressMap.values()));
      setOverallProgress(0);

      try {
        // Process all files in a single batch using the updated server API
        await onUpload(files);

        // Set all files to complete
        setUploadProgress((prev) =>
          prev.map((p) => ({
            ...p,
            progress: 100,
            status: "complete" as const,
          }))
        );
        setOverallProgress(100);

        // Clear progress after a delay
        setTimeout(() => {
          setUploadProgress([]);
          setOverallProgress(0);
        }, 2000);
      } catch (error) {
        console.error("Upload failed:", error);

        // Update progress to show error state
        setUploadProgress((prev) =>
          prev.map((p) => ({
            ...p,
            status: "error" as const,
            error: error instanceof Error ? error.message : "Upload failed",
          }))
        );
      } finally {
        // Clear the file input value
        event.target.value = "";
      }
    },
    [onUpload]
  );

  const handleDelete = useCallback(
    async (image: ImageData) => {
      if (!onDelete) return;
      try {
        await onDelete(image);
      } catch (error) {
        console.error("Delete failed:", error);
      }
    },
    [onDelete]
  );

  // Add copy to clipboard function
  const copyToClipboard = useCallback(
    async (text: string, buttonId: string) => {
      try {
        await navigator.clipboard.writeText(text);
        const button = document.getElementById(buttonId);
        if (button) {
          const icon = button.querySelector("svg");
          const check = button.querySelector(".check-icon");
          if (icon && check) {
            icon.classList.add("hidden");
            check.classList.remove("hidden");
            setTimeout(() => {
              icon.classList.remove("hidden");
              check.classList.add("hidden");
            }, 2000);
          }
        }
      } catch (err) {
        console.error("Failed to copy text: ", err);
      }
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col h-[400px] items-center justify-center gap-4">
        {isEditing ? (
          <>
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="h-12 w-12 mb-2" />
              <p className="text-lg font-medium">No images yet</p>
              <p className="text-sm">Upload images to get started</p>
              <Button
                variant="outline"
                size="lg"
                className="mt-4"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Images
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </Button>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground">No images available</div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("space-y-4", className)}
      role="region"
      aria-label="Image gallery"
      tabIndex={0}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          {showCategoryTabs && categories.length > 1 && (
            <Tabs
              defaultValue="all"
              value={currentTab}
              onValueChange={setCurrentTab}
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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-accent text-accent-foreground")}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px]"
            />
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/50 rounded-lg">
            <Select value={selectedAngle} onValueChange={setSelectedAngle}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Angle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All angles</SelectItem>
                {allowedValues.angle.map((angle) => (
                  <SelectItem key={angle} value={angle}>
                    {angle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedView} onValueChange={setSelectedView}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All views</SelectItem>
                {allowedValues.view.map((view) => (
                  <SelectItem key={view} value={view}>
                    {view}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedMovement}
              onValueChange={setSelectedMovement}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Movement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All movement</SelectItem>
                {allowedValues.movement.map((movement) => (
                  <SelectItem key={movement} value={movement}>
                    {movement}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTod} onValueChange={setSelectedTod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Time of Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All times</SelectItem>
                {allowedValues.tod.map((tod) => (
                  <SelectItem key={tod} value={tod}>
                    {tod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSide} onValueChange={setSelectedSide}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Side" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sides</SelectItem>
                {allowedValues.side.map((side) => (
                  <SelectItem key={side} value={side}>
                    {side}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="text-sm font-medium">Overall Progress</div>
            <Progress value={overallProgress} className="h-2" />
          </div>
          <div className="space-y-2">
            {uploadProgress.map((progress) => (
              <div key={progress.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{progress.filename}</span>
                  <span>{progress.status}</span>
                </div>
                <Progress value={progress.progress} className="h-1" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
        {/* Main Image */}
        <div
          className={cn(
            "relative aspect-[3/2] bg-muted rounded-lg overflow-hidden",
            isEditing &&
              !selectedImage &&
              "border-2 border-dashed border-border hover:border-primary cursor-pointer"
          )}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            if (isEditing && !selectedImage) {
              document.getElementById("file-upload")?.click();
            } else {
              handleZoomClick(e);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (isEditing && !selectedImage) {
                document.getElementById("file-upload")?.click();
              } else {
                handleZoomClick(e as any);
              }
            }
          }}
          aria-label={
            selectedImage
              ? `Current image: ${
                  selectedImage.metadata?.description ||
                  selectedImage.filename ||
                  "Car image"
                }`
              : isEditing
                ? "Click or drag files to upload images"
                : "No image selected"
          }
        >
          {selectedImage ? (
            <>
              <Image
                src={selectedImage.url}
                alt={
                  selectedImage.metadata?.description ||
                  selectedImage.filename ||
                  "Car image"
                }
                fill
                className="object-cover"
                priority
                onLoad={() => setMainImageLoaded(true)}
              />
              {!mainImageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black opacity-0 hover:opacity-30 transition-opacity" />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "border border-white transition-colors",
                    showMetadata
                      ? "bg-white/20 hover:bg-white/30"
                      : "bg-transparent hover:bg-black/20"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMetadata(!showMetadata);
                  }}
                >
                  <Info className="h-4 w-4 text-white" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border border-white bg-transparent hover:bg-black/20 transition-colors"
                  onClick={handleZoomClick}
                >
                  <ZoomIn className="h-4 w-4 text-white" />
                </Button>
              </div>
              {showMetadata && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                  <div className="text-white space-y-1">
                    {selectedImage.metadata?.description && (
                      <p className="text-sm font-medium">
                        {selectedImage.metadata.description}
                      </p>
                    )}
                    <div className="text-xs space-x-2">
                      {selectedImage.metadata?.angle && (
                        <span>{selectedImage.metadata.angle}</span>
                      )}
                      {selectedImage.metadata?.view && (
                        <span>{selectedImage.metadata.view}</span>
                      )}
                      {selectedImage.metadata?.movement && (
                        <span>{selectedImage.metadata.movement}</span>
                      )}
                      {selectedImage.metadata?.tod && (
                        <span>{selectedImage.metadata.tod}</span>
                      )}
                      {selectedImage.metadata?.side && (
                        <span>{selectedImage.metadata.side}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 border border-white bg-transparent hover:bg-black/20 transition-colors"
                onClick={() => navigateImages("prev")}
              >
                <ChevronLeft className="h-4 w-4 text-white" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 border border-white bg-transparent hover:bg-black/20 transition-colors"
                onClick={() => navigateImages("next")}
              >
                <ChevronRight className="h-4 w-4 text-white" />
              </Button>
            </>
          ) : isEditing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Upload className="h-8 w-8 mb-2" />
              <p className="text-sm font-medium">
                Click or drag files to upload images
              </p>
              <p className="text-xs">Supported formats: JPG, PNG, WebP</p>
            </div>
          ) : null}
        </div>

        {/* Thumbnails Grid with Pagination */}
        <div className="flex flex-col h-full">
          <div
            className="grid grid-cols-3 gap-2 overflow-y-auto bg-muted/50 rounded-lg p-3"
            style={{ maxHeight: "800px" }}
            role="listbox"
            aria-label="Image thumbnails"
          >
            {currentThumbnails.map((image) => (
              <div
                key={image._id}
                className={cn(
                  "relative w-full pb-[75%] rounded-md overflow-hidden cursor-pointer group transition-all duration-200",
                  selectedImage?._id === image._id
                    ? "ring-2 ring-primary"
                    : "opacity-80 hover:opacity-100"
                )}
                onClick={() => handleThumbnailClick(image)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleThumbnailClick(image);
                  }
                }}
                role="option"
                aria-selected={selectedImage?._id === image._id}
                tabIndex={0}
                aria-label={
                  image.metadata?.description || image.filename || "Car image"
                }
              >
                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-200",
                    selectedImage?._id === image._id
                      ? "opacity-100"
                      : "group-hover:opacity-100"
                  )}
                >
                  <Image
                    src={image.url}
                    alt={
                      image.metadata?.description ||
                      image.filename ||
                      "Car image"
                    }
                    fill
                    className="object-cover bg-background"
                    sizes="(max-width: 768px) 33vw, 200px"
                  />
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity" />
                  {image.metadata?.isPrimary && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] px-1 py-0.5 rounded-full">
                      Primary
                    </div>
                  )}
                  {isEditing && (
                    <>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(image);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {/* Set as Primary button, only if not already primary */}
                      {!image.metadata?.isPrimary && onSetPrimary && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-primary text-primary hover:text-primary-foreground border border-primary h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetPrimary(image);
                          }}
                          title="Set as primary image"
                        >
                          <Pin className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              className="flex justify-center items-center gap-2 mt-2 p-2"
              role="navigation"
              aria-label="Gallery pagination"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handlePageChange(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* File Information Display */}
      {selectedImage && (
        <FileInfoDisplay
          fileName={selectedImage.filename || "Untitled"}
          fileUrl={selectedImage.url}
        />
      )}

      {/* Lightbox Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-7xl w-full p-0">
          <DialogTitle className="flex justify-between items-center p-4">
            <span className="text-lg font-semibold">
              {selectedImage?.metadata?.description ||
                selectedImage?.filename ||
                "Image"}
            </span>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" onClick={handleCloseDialog}>
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </DialogTitle>

          <div className="relative aspect-[16/9] bg-black">
            {selectedImage && (
              <Image
                src={selectedImage.url}
                alt={
                  selectedImage.metadata?.description ||
                  selectedImage.filename ||
                  "Car image"
                }
                fill
                className="object-cover"
                priority
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white"
              onClick={() => navigateImages("prev")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white"
              onClick={() => navigateImages("next")}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {selectedImage?.metadata && (
            <div className="p-4 space-y-4">
              {/* Image Details */}
              <div className="space-y-2">
                <h3 className="font-semibold">Image Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(selectedImage.metadata)
                    .filter(([key]) => key !== "isPrimary")
                    .map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="font-medium capitalize mr-2">
                          {key}:
                        </span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* File Information */}
              <div className="space-y-2">
                <h3 className="font-semibold">File Information</h3>
                <div className="space-y-2">
                  {/* Filename */}
                  <div className="flex items-center justify-between bg-muted p-2 rounded-md">
                    <div className="flex-1 mr-2">
                      <div className="text-sm font-medium mb-1">Filename</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {selectedImage.filename || "Untitled"}
                      </div>
                    </div>
                    <Button
                      id="copy-filename-btn"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          selectedImage.filename || "",
                          "copy-filename-btn"
                        )
                      }
                    >
                      <Copy className="h-4 w-4" />
                      <Check className="h-4 w-4 check-icon hidden" />
                    </Button>
                  </div>

                  {/* URL */}
                  <div className="flex items-center justify-between bg-muted p-2 rounded-md">
                    <div className="flex-1 mr-2">
                      <div className="text-sm font-medium mb-1">Public URL</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {selectedImage.url}
                      </div>
                    </div>
                    <Button
                      id="copy-url-btn"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(selectedImage.url, "copy-url-btn")
                      }
                    >
                      <Copy className="h-4 w-4" />
                      <Check className="h-4 w-4 check-icon hidden" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
