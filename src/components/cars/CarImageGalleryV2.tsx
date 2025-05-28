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
  Edit,
  Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { CloudflareImage } from "@/components/ui/CloudflareImage";

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
  onEditToggle?: () => void;
}

// Hook to detect mobile screen size
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
};

// Hook for swipe gestures
const useSwipeGesture = (onSwipeLeft: () => void, onSwipeRight: () => void) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [currentSwipeOffset, setCurrentSwipeOffset] = useState(0);
  const [isSwipingActive, setIsSwipingActive] = useState(false);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwipingActive(true);
    setCurrentSwipeOffset(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const currentTouch = e.targetTouches[0].clientX;
    const swipeDistance = currentTouch - touchStart;

    // Limit the swipe distance to prevent over-swiping
    const maxSwipe = 100;
    const limitedSwipe = Math.max(-maxSwipe, Math.min(maxSwipe, swipeDistance));

    setCurrentSwipeOffset(limitedSwipe);
    setTouchEnd(currentTouch);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsSwipingActive(false);
      setCurrentSwipeOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      onSwipeLeft();
    } else if (isRightSwipe) {
      onSwipeRight();
    }

    // Reset swipe state
    setIsSwipingActive(false);
    setCurrentSwipeOffset(0);
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    swipeOffset: currentSwipeOffset,
    isSwipingActive,
  };
};

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
  onEditToggle,
}: CarImageGalleryV2Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  // Responsive thumbnails per page
  const THUMBNAILS_PER_PAGE = isMobile ? 6 : 12;

  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  // Set showMetadata to false on mobile by default, true on desktop
  const [showMetadata, setShowMetadata] = useState(!isMobile);
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

  // Update showMetadata when screen size changes
  useEffect(() => {
    setShowMetadata(!isMobile);
  }, [isMobile]);

  // Get current page and image from URL or default values
  const currentPage = Number(searchParams?.get("page")) || 1;
  const currentImageId = searchParams?.get("image");

  // Function to update URL with new page number and image ID
  const updateUrlState = useCallback(
    (newPage: number, imageId: string) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
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
          if (selectedImage && !isMobile) {
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
    [selectedImage, showImageDialog, navigateImages, isMobile]
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

      // [REMOVED] // [REMOVED] console.log(`Starting upload of ${files.length} files`);

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

  // Add swipe gesture support
  const swipeHandlers = useSwipeGesture(
    () => navigateImages("next"), // swipe left = next
    () => navigateImages("prev") // swipe right = prev
  );

  // Destructure swipe handlers to separate DOM events from state
  const {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    swipeOffset,
    isSwipingActive,
  } = swipeHandlers;

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
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Upload className="h-12 w-12 mb-2" />
          <p className="text-lg font-medium">No images yet</p>
          <p className="text-sm">Upload images to get started</p>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                if (onOpenUploadModal) {
                  onOpenUploadModal();
                } else {
                  document.getElementById("file-upload")?.click();
                }
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Images
              {!onOpenUploadModal && (
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              )}
            </Button>
            {!isEditing && onEditToggle && (
              <Button variant="default" size="lg" onClick={onEditToggle}>
                <Pencil className="h-4 w-4 mr-2" />
                Start Editing
              </Button>
            )}
          </div>
        </div>
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
        <div className="flex flex-col gap-4">
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

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-accent text-accent-foreground")}
            >
              <Filter className="h-4 w-4" />
            </Button>

            {/* Desktop filters - animate in between filter button and search */}
            {showFilters && (
              <div className="hidden lg:flex items-center gap-2 animate-in slide-in-from-left-5 duration-200">
                <Select value={selectedAngle} onValueChange={setSelectedAngle}>
                  <SelectTrigger className="w-[120px]">
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
                  <SelectTrigger className="w-[120px]">
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
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Time" />
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
                  <SelectTrigger className="w-[120px]">
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

            <Input
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-0 sm:w-[200px] sm:flex-none"
            />
            {/* Mobile info button */}
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "sm:hidden",
                showMetadata ? "bg-accent text-accent-foreground" : ""
              )}
              onClick={() => setShowMetadata(!showMetadata)}
            >
              <Info className="h-4 w-4" />
            </Button>
            {onEditToggle && (
              <Button
                variant="outline"
                onClick={onEditToggle}
                className={cn(
                  "shrink-0",
                  isEditing && "bg-accent text-accent-foreground"
                )}
              >
                {isEditing ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Done Editing</span>
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Edit Gallery</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile filters - below search bar */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-2 p-4 border border-border rounded-lg bg-transparent">
            <Select value={selectedAngle} onValueChange={setSelectedAngle}>
              <SelectTrigger>
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
              <SelectTrigger>
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
              <SelectTrigger>
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
              <SelectTrigger>
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
              <SelectTrigger>
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

      <div
        className={cn(
          "grid gap-4",
          isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[2fr_1fr]"
        )}
      >
        {/* Main Image */}
        <div
          className={cn(
            "relative bg-muted rounded-lg overflow-hidden aspect-[3/2]",
            isEditing &&
              !selectedImage &&
              "border-2 border-dashed border-border hover:border-primary cursor-pointer"
          )}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            if (isEditing && !selectedImage) {
              document.getElementById("file-upload")?.click();
            } else if (!isMobile) {
              // Only open modal on desktop
              handleZoomClick(e);
            }
            // Do nothing on mobile tap
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (isEditing && !selectedImage) {
                document.getElementById("file-upload")?.click();
              } else if (!isMobile) {
                handleZoomClick(e as any);
              }
            }
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
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
              <div className="relative w-full h-full">
                {/* Current Image */}
                <div
                  className="absolute inset-0 transition-transform duration-200 ease-out"
                  style={{
                    transform:
                      isMobile && isSwipingActive
                        ? `translateX(${swipeOffset}px)`
                        : "translateX(0px)",
                  }}
                >
                  <CloudflareImage
                    src={selectedImage.url}
                    alt={
                      selectedImage.metadata?.description ||
                      selectedImage.filename ||
                      "Car image"
                    }
                    fill
                    className="object-cover"
                    priority
                    variant="hero"
                    onLoad={() => setMainImageLoaded(true)}
                  />
                </div>

                {/* Next Image (slides in from right when swiping left) */}
                {isMobile &&
                  isSwipingActive &&
                  swipeOffset < 0 &&
                  (() => {
                    const currentIndex = filteredImages.findIndex(
                      (img) => img._id === selectedImage._id
                    );
                    const nextImage =
                      filteredImages[
                        (currentIndex + 1) % filteredImages.length
                      ];
                    return nextImage ? (
                      <div
                        className="absolute inset-0 transition-transform duration-200 ease-out"
                        style={{
                          transform: `translateX(calc(100% + ${swipeOffset}px))`,
                        }}
                      >
                        <CloudflareImage
                          src={nextImage.url}
                          alt={
                            nextImage.metadata?.description ||
                            nextImage.filename ||
                            "Next car image"
                          }
                          fill
                          className="object-cover"
                          variant={isMobile ? "medium" : "large"}
                        />
                      </div>
                    ) : null;
                  })()}

                {/* Previous Image (slides in from left when swiping right) */}
                {isMobile &&
                  isSwipingActive &&
                  swipeOffset > 0 &&
                  (() => {
                    const currentIndex = filteredImages.findIndex(
                      (img) => img._id === selectedImage._id
                    );
                    const prevImage =
                      filteredImages[
                        (currentIndex - 1 + filteredImages.length) %
                          filteredImages.length
                      ];
                    return prevImage ? (
                      <div
                        className="absolute inset-0 transition-transform duration-200 ease-out"
                        style={{
                          transform: `translateX(calc(-100% + ${swipeOffset}px))`,
                        }}
                      >
                        <CloudflareImage
                          src={prevImage.url}
                          alt={
                            prevImage.metadata?.description ||
                            prevImage.filename ||
                            "Previous car image"
                          }
                          fill
                          className="object-cover"
                          variant={isMobile ? "medium" : "large"}
                        />
                      </div>
                    ) : null;
                  })()}
              </div>
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
                    "border border-white transition-colors hidden sm:flex",
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
                  className="border border-white bg-transparent hover:bg-black/20 transition-colors hidden sm:flex"
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
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 border border-white bg-transparent hover:bg-black/20 transition-colors hidden sm:flex"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImages("prev");
                }}
              >
                <ChevronLeft className="h-4 w-4 text-white" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 border border-white bg-transparent hover:bg-black/20 transition-colors hidden sm:flex"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImages("next");
                }}
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
        {filteredImages.length > 0 && (
          <div className={cn(isMobile ? "space-y-4" : "flex flex-col h-full")}>
            <div
              className={cn(
                "gap-2",
                isMobile
                  ? "grid grid-cols-3"
                  : "grid grid-cols-2 xl:grid-cols-3 overflow-y-auto bg-muted/50 rounded-lg p-3"
              )}
              style={!isMobile ? { maxHeight: "800px" } : {}}
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
                    <CloudflareImage
                      src={image.url}
                      alt={
                        image.metadata?.description ||
                        image.filename ||
                        "Car image"
                      }
                      fill
                      className="object-cover bg-background"
                      sizes="(max-width: 768px) 33vw, 200px"
                      variant="gallery"
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
                className={cn(
                  "flex justify-center items-center gap-2",
                  !isMobile && "mt-2 p-2"
                )}
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
        )}
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
        <DialogContent className="max-w-7xl w-full p-0 max-h-[90vh] overflow-hidden">
          <DialogTitle className="flex justify-between items-center p-4 border-b">
            <span className="text-lg font-semibold truncate pr-4">
              {selectedImage?.metadata?.description ||
                selectedImage?.filename ||
                "Image"}
            </span>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseDialog}
                className="shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </DialogTitle>

          <div className="flex flex-col max-h-[calc(90vh-4rem)] overflow-hidden">
            <div className="relative aspect-[16/9] bg-black shrink-0">
              {selectedImage && (
                <CloudflareImage
                  src={selectedImage.url}
                  alt={
                    selectedImage.metadata?.description ||
                    selectedImage.filename ||
                    "Car image"
                  }
                  fill
                  className="object-cover"
                  priority
                  variant="hero"
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImages("prev");
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImages("next");
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {selectedImage?.metadata && selectedImage.metadata.description && (
              <div className="p-4 space-y-4 overflow-y-auto">
                {/* Image Details */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Image Details</h3>
                  <div className="text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium mb-1">Description:</span>
                      <span className="break-words">
                        {selectedImage.metadata.description}
                      </span>
                    </div>
                  </div>
                </div>

                {/* File Information */}
                <div className="space-y-2">
                  <h3 className="font-semibold">File Information</h3>
                  <div className="space-y-2">
                    {/* Filename */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-muted p-2 rounded-md gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium mb-1">Filename</div>
                        <div className="text-sm text-muted-foreground break-all sm:truncate">
                          {selectedImage.filename || "Untitled"}
                        </div>
                      </div>
                      <Button
                        id="copy-filename-btn"
                        variant="outline"
                        size="sm"
                        className="shrink-0 w-full sm:w-auto"
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-muted p-2 rounded-md gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium mb-1">
                          Public URL
                        </div>
                        <div className="text-sm text-muted-foreground break-all sm:truncate">
                          {selectedImage.url}
                        </div>
                      </div>
                      <Button
                        id="copy-url-btn"
                        variant="outline"
                        size="sm"
                        className="shrink-0 w-full sm:w-auto"
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
