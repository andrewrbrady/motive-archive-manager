"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { transformImageUrl, imagePresets } from "@/lib/imageTransform";
import Image from "next/image";
import { toast } from "react-hot-toast";

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
    };
    variants?: {
      [key: string]: string;
    };
    createdAt: string;
    updatedAt: string;
  }[];
  isLoading?: boolean;
  carId?: string;
  primaryImageId?: string;
  onPrimaryImageChange?: (imageId: string) => void;
}

export const ImageGalleryEnhanced: React.FC<ImageGalleryProps> = ({
  images,
  isLoading = false,
  carId,
  primaryImageId,
  onPrimaryImageChange,
}) => {
  // Debug input images for duplicates
  useEffect(() => {
    const imageIds = images.map((img) => img.id);
    const uniqueIds = new Set(imageIds);
    console.log("Input images count:", images.length);
    console.log("Input unique IDs count:", uniqueIds.size);

    if (imageIds.length !== uniqueIds.size) {
      console.warn("DUPLICATE IMAGES DETECTED IN INPUT:");
      const counts = imageIds.reduce((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      type CountEntry = [string, number];
      const entries = Object.entries(counts) as CountEntry[];
      const duplicates = entries.filter(([_, count]) => count > 1);
      console.warn("Duplicate IDs:", duplicates);

      // Log details of each duplicate
      duplicates.forEach(([id, count]) => {
        const dupes = images.filter((img) => img.id === id);
        console.warn(`Image ID ${id} appears ${count} times:`, dupes);
      });
    }
  }, [images]);

  // Deduplicate images by ID and sort by filename
  const sortedImages = React.useMemo(() => {
    // Create a Map to deduplicate by ID
    const uniqueImagesMap = new Map();

    // Keep only one instance of each image ID
    images.forEach((img) => {
      if (!uniqueImagesMap.has(img.id)) {
        uniqueImagesMap.set(img.id, img);
      }
    });

    // Convert back to array and sort
    return Array.from(uniqueImagesMap.values()).sort((a, b) =>
      a.filename.localeCompare(b.filename)
    );
  }, [images]);

  console.log(
    "ImageGalleryEnhanced: Rendering with",
    sortedImages.length,
    "images after deduplication"
  );

  const [mainIndex, setMainIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMainVisible, setIsMainVisible] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{
    angle?: string;
    view?: string;
    movement?: string;
    tod?: string;
  }>({});
  const [updatingThumbnail, setUpdatingThumbnail] = useState<string | null>(
    null
  );
  const mainImageRef = useRef<HTMLDivElement>(null);
  const interactiveImageRef = useRef<HTMLButtonElement>(null);
  const imagesPerRow = 3;
  const rowsPerPage = 5;
  const loadedThumbnailsRef = useRef<Set<string>>(new Set());

  // Find the index of the primary image - ONLY ON INITIAL LOAD
  const [hasSetInitialImage, setHasSetInitialImage] = useState(false);

  useEffect(() => {
    console.log("ImageGalleryEnhanced: primaryImageId effect triggered", {
      primaryImageId,
      imagesCount: sortedImages.length,
      hasSetInitialImage,
    });

    // Only set the primary image on initial load or when primaryImageId explicitly changes
    if (primaryImageId && !hasSetInitialImage) {
      const primaryIndex = sortedImages.findIndex(
        (img) => img.id === primaryImageId
      );
      console.log("ImageGalleryEnhanced: primaryImage search result:", {
        primaryIndex,
        primaryImageId,
      });

      if (primaryIndex !== -1) {
        setMainIndex(primaryIndex);
        setHasSetInitialImage(true);
      }
    }
  }, [primaryImageId, sortedImages, hasSetInitialImage]);

  // Reset image loaded state when images change
  useEffect(() => {
    setImagesLoaded(false);
    setMainImageLoaded(false);
  }, [images]);

  // Get unique filter values
  const filterOptions = sortedImages.reduce(
    (acc, img) => {
      if (
        img.metadata.angle &&
        !acc.angles.includes(img.metadata.angle) &&
        ![
          "not applicable",
          "n/a",
          "N/A",
          "na",
          "none",
          "Not Applicable",
          "unknown",
          "Unknown",
        ].includes(img.metadata.angle.toLowerCase())
      ) {
        acc.angles.push(img.metadata.angle);
      }
      if (
        img.metadata.view &&
        !acc.views.includes(img.metadata.view) &&
        ![
          "not applicable",
          "n/a",
          "N/A",
          "na",
          "none",
          "Not Applicable",
          "unknown",
          "Unknown",
        ].includes(img.metadata.view.toLowerCase())
      ) {
        acc.views.push(img.metadata.view);
      }
      if (
        img.metadata.movement &&
        !acc.movements.includes(img.metadata.movement) &&
        ![
          "not applicable",
          "n/a",
          "N/A",
          "na",
          "none",
          "Not Applicable",
          "unknown",
          "Unknown",
        ].includes(img.metadata.movement.toLowerCase())
      ) {
        acc.movements.push(img.metadata.movement);
      }
      if (
        img.metadata.tod &&
        !acc.tods.includes(img.metadata.tod) &&
        ![
          "not applicable",
          "n/a",
          "N/A",
          "na",
          "none",
          "Not Applicable",
          "unknown",
          "Unknown",
        ].includes(img.metadata.tod.toLowerCase())
      ) {
        acc.tods.push(img.metadata.tod);
      }
      return acc;
    },
    { angles: [], views: [], movements: [], tods: [] } as {
      angles: string[];
      views: string[];
      movements: string[];
      tods: string[];
    }
  );

  // Filter images based on active filters
  const filteredImages = sortedImages.filter((img) => {
    return Object.entries(activeFilters).every(([key, value]) => {
      if (!value) return true;
      return img.metadata[key as keyof typeof img.metadata] === value;
    });
  });

  // Pre-calculate optimized image URLs using the transformImageUrl utility
  const optimizedImages = React.useMemo(() => {
    return filteredImages.map((img) => {
      // Check if URL already ends with /public
      const url = img.url.endsWith("/public") ? img.url : `${img.url}/public`;

      return {
        ...img,
        // Use the same URL for both thumbnail and main image views
        thumbnailUrl: url,
        mainUrl: url,
      };
    });
  }, [filteredImages]);

  // Log the first few images for debugging
  useEffect(() => {
    if (optimizedImages.length > 0) {
      console.log(
        "ImageGallery: Sample of image URLs (first 3 images):",
        optimizedImages.slice(0, 3).map((img) => ({
          original: img.url,
          transformed: img.thumbnailUrl,
          id: img.id,
        }))
      );
    }
  }, [optimizedImages]);

  const itemsPerPage = imagesPerRow * rowsPerPage;
  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    console.log("ImageGallery: Filters changed, resetting to page 1", {
      activeFilters,
    });
    // Always reset to page 1 when filters change
    setCurrentPage(1);

    // Only reset the main image if we have images and filters have actually changed
    // This avoids resetting during initial render
    if (filteredImages.length > 0) {
      console.log("ImageGallery: Resetting main image to first filtered image");
      setMainIndex(0);
      // Reset the image loaded state
      setMainImageLoaded(false);
    }
  }, [activeFilters, filteredImages.length]);

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
    // Ensure selected image is visible in current page
    const selectedImagePage = Math.floor(mainIndex / itemsPerPage) + 1;
    if (selectedImagePage !== currentPage) {
      console.log("ImageGallery: Image not on current page, updating page", {
        mainIndex,
        selectedImagePage,
        currentPage,
      });
      setCurrentPage(selectedImagePage);
    }
    // We only want this effect to run when mainIndex changes,
    // not when currentPage changes, to avoid circular updates
  }, [mainIndex, itemsPerPage]);

  const handleNext = useCallback(() => {
    if (isModalOpen) {
      const newModalIndex = (modalIndex + 1) % optimizedImages.length;
      console.log("ImageGallery: Modal next image", {
        from: modalIndex,
        to: newModalIndex,
        totalImages: optimizedImages.length,
      });
      setModalIndex(newModalIndex);
    } else {
      // Force image reload when advancing to next image
      setMainImageLoaded(false);
      setMainIndex((prev) => {
        const newIndex = (prev + 1) % optimizedImages.length;
        console.log(
          `ImageGallery: handleNext - changing from ${prev} to ${newIndex}`,
          {
            totalImages: optimizedImages.length,
            newImageId: optimizedImages[newIndex]?.id,
          }
        );
        return newIndex;
      });
    }
  }, [isModalOpen, optimizedImages.length, modalIndex, optimizedImages]);

  const handlePrev = useCallback(() => {
    if (isModalOpen) {
      const newModalIndex =
        (modalIndex - 1 + optimizedImages.length) % optimizedImages.length;
      console.log("ImageGallery: Modal previous image", {
        from: modalIndex,
        to: newModalIndex,
        totalImages: optimizedImages.length,
      });
      setModalIndex(newModalIndex);
    } else {
      // Force image reload when going to previous image
      setMainImageLoaded(false);
      setMainIndex((prev) => {
        const newIndex =
          (prev - 1 + optimizedImages.length) % optimizedImages.length;
        console.log(
          `ImageGallery: handlePrev - changing from ${prev} to ${newIndex}`,
          {
            totalImages: optimizedImages.length,
            newImageId: optimizedImages[newIndex]?.id,
          }
        );
        return newIndex;
      });
    }
  }, [isModalOpen, optimizedImages.length, modalIndex, optimizedImages]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        console.log("ImageGallery: Changing page", {
          from: currentPage,
          to: newPage,
          totalPages,
          itemsPerPage,
        });
        setCurrentPage(newPage);
        // Set mainIndex to first image of the new page
        const newMainIndex = (newPage - 1) * itemsPerPage;
        if (newMainIndex < optimizedImages.length) {
          console.log("ImageGallery: Updating main index for new page", {
            newMainIndex,
            imageId: optimizedImages[newMainIndex]?.id,
          });
          setMainIndex(newMainIndex);
        }
      }
    },
    [
      totalPages,
      itemsPerPage,
      optimizedImages.length,
      currentPage,
      optimizedImages,
    ]
  );

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

  // Add keyboard navigation effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input elements have focus
      const activeElement = document.activeElement;
      const isInput =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.getAttribute("contenteditable") === "true";

      // Check if gallery elements have focus
      const galleryHasFocus =
        interactiveImageRef.current?.contains(activeElement as Node) ||
        mainImageRef.current?.contains(activeElement as Node) ||
        isModalOpen;

      // Debug information
      console.log("Gallery key event:", {
        key: e.key,
        isInput,
        isModalOpen,
        galleryHasFocus,
        activeElement: activeElement?.tagName,
        mainIndex,
        modalIndex,
        imagesCount: optimizedImages.length,
      });

      // Exit early if we're typing in an input and modal is not open
      if (isInput && !isModalOpen) {
        return;
      }

      // Handle escape to close modal
      if (e.key === "Escape" && isModalOpen) {
        e.preventDefault();
        console.log("ImageGallery: Closing modal with Escape key");
        setIsModalOpen(false);
        return;
      }

      // Only handle navigation if modal is open or gallery has focus
      if (!isModalOpen && !galleryHasFocus) {
        console.log(
          "ImageGallery: Skipping key handling - gallery not focused"
        );
        return;
      }

      // Pagination with Shift+Arrow keys
      if (e.shiftKey) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          console.log("ImageGallery: Shift+Left - Changing to previous page");
          handlePageChange(Math.max(1, currentPage - 1));
          return;
        }

        if (e.key === "ArrowRight") {
          e.preventDefault();
          console.log("ImageGallery: Shift+Right - Changing to next page");
          handlePageChange(Math.min(totalPages, currentPage + 1));
          return;
        }
      }

      // Image navigation with arrow keys
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        console.log("ImageGallery: Left arrow - Previous image");
        handlePrev();
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        console.log("ImageGallery: Right arrow - Next image");
        handleNext();
        return;
      }

      // Open modal with Enter/Space when main image has focus
      if (document.activeElement === interactiveImageRef.current) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          console.log("ImageGallery: Opening modal with keyboard");
          setModalIndex(mainIndex);
          setIsModalOpen(true);
        }
      }
    };

    console.log("ImageGallery: Setting up keyboard event listeners", {
      imagesCount: optimizedImages.length,
      currentPage,
      totalPages,
      isModalOpen,
    });

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      console.log("ImageGallery: Removing keyboard event listeners");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    handleNext,
    handlePrev,
    isModalOpen,
    currentPage,
    totalPages,
    handlePageChange,
    optimizedImages.length,
    mainIndex,
    modalIndex,
  ]);

  // Add focus trap and management for the modal
  useEffect(() => {
    if (!isModalOpen) return;

    console.log("ImageGallery: Modal opened, setting up focus trap");

    // Store the element that had focus before opening modal
    const previouslyFocused = document.activeElement as HTMLElement;

    // After modal closed, restore focus
    return () => {
      if (previouslyFocused) {
        console.log("ImageGallery: Modal closed, restoring focus");
        previouslyFocused.focus();
      }
    };
  }, [isModalOpen]);

  const handleFilterChange = (
    filterType: string,
    value: string | undefined
  ) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterType]:
        value === prev[filterType as keyof typeof prev] ? undefined : value,
    }));
  };

  const paginatedImages = optimizedImages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    // Debug logging for duplicate image detection
    const ids = paginatedImages.map((img) => img.id);
    const uniqueIds = new Set(ids);
    console.log("Paginated images count:", paginatedImages.length);
    console.log("Unique IDs count:", uniqueIds.size);
    if (ids.length !== uniqueIds.size) {
      console.warn("Duplicate image IDs detected in paginated images");
      const counts = ids.reduce((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      // Cast the entries to the correct type
      type CountEntry = [string, number];
      const entries = Object.entries(counts) as CountEntry[];
      const duplicates = entries.filter(([_, count]) => count > 1);
      console.warn("Duplicate IDs:", duplicates);

      // Log the duplicate image details
      duplicates.forEach(([id, count]) => {
        const duplicateImages = paginatedImages.filter((img) => img.id === id);
        console.warn(`Image ID ${id} appears ${count} times:`, duplicateImages);
      });
    }
  }, [paginatedImages]);

  const handleSetAsThumbnail = async (imageId: string) => {
    if (!carId) {
      toast.error("Cannot set thumbnail: Car ID is not available");
      return;
    }

    setUpdatingThumbnail(imageId);

    try {
      const response = await fetch(`/api/cars/${carId}/thumbnail`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ primaryImageId: imageId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update thumbnail");
      }

      toast.success("Thumbnail updated successfully");

      // Call the callback if provided
      if (onPrimaryImageChange) {
        onPrimaryImageChange(imageId);
      }
    } catch (error) {
      console.error("Error updating thumbnail:", error);
      toast.error("Failed to update thumbnail");
    } finally {
      setUpdatingThumbnail(null);
    }
  };

  // Add this below the handlePageChange function
  const handleThumbnailClick = useCallback(
    (actualIndex: number) => {
      console.log("ImageGallery: Thumbnail click handler called", {
        actualIndex,
        currentMainIndex: mainIndex,
        imageId: optimizedImages[actualIndex]?.id,
        totalImages: optimizedImages.length,
      });

      // Only proceed if this isn't already the selected image
      if (actualIndex === mainIndex) {
        console.log(
          `ImageGallery: Thumbnail already selected, opening modal for index ${actualIndex}`
        );
        // If already selected, open the modal instead
        setModalIndex(actualIndex);
        setIsModalOpen(true);
        return;
      }

      console.log(
        `ImageGallery: Thumbnail clicked, updating mainIndex from ${mainIndex} to ${actualIndex}`
      );

      // First reset the image loaded state
      setMainImageLoaded(false);

      // Then update the index immediately
      setMainIndex(actualIndex);
    },
    [mainIndex, optimizedImages]
  );

  // Add preloading after the optimizedImages calculation
  useEffect(() => {
    // Only preload if we have images and the main one has loaded
    if (optimizedImages.length <= 1 || !mainImageLoaded) return;

    // First preload the next 2 images (based on likely navigation direction)
    const preloadNextImages = () => {
      // Preload the next 2 images
      for (let i = 1; i <= 2; i++) {
        const indexToPreload = (mainIndex + i) % optimizedImages.length;
        if (indexToPreload !== mainIndex) {
          const imgPreload = new (window.Image as any)();
          imgPreload.src = optimizedImages[indexToPreload].mainUrl;
        }
      }

      // Also preload the previous image (for back navigation)
      const prevIndex =
        (mainIndex - 1 + optimizedImages.length) % optimizedImages.length;
      if (prevIndex !== mainIndex) {
        const prevImgPreload = new (window.Image as any)();
        prevImgPreload.src = optimizedImages[prevIndex].mainUrl;
      }
    };

    // Use a small timeout to not compete with the main image loading
    const timerId = setTimeout(preloadNextImages, 300);

    return () => clearTimeout(timerId);
  }, [mainIndex, optimizedImages, mainImageLoaded]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 pb-4 border-[hsl(var(--border-muted))] dark:border-[hsl(var(--border-muted))]">
        {filterOptions.angles.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
              Angle
            </h3>
            <div className="flex flex-wrap gap-2">
              {filterOptions.angles.map((angle: string) => (
                <button
                  key={angle}
                  onClick={() => handleFilterChange("angle", angle)}
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

        {filterOptions.views.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
              View
            </h3>
            <div className="flex flex-wrap gap-2">
              {filterOptions.views.map((view: string) => (
                <button
                  key={view}
                  onClick={() => handleFilterChange("view", view)}
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

        {filterOptions.movements.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
              Movement
            </h3>
            <div className="flex flex-wrap gap-2">
              {filterOptions.movements.map((movement: string) => (
                <button
                  key={movement}
                  onClick={() => handleFilterChange("movement", movement)}
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

        {filterOptions.tods.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
              Time of Day
            </h3>
            <div className="flex flex-wrap gap-2">
              {filterOptions.tods.map((tod: string) => (
                <button
                  key={tod}
                  onClick={() => handleFilterChange("tod", tod)}
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
      </div>

      {/* Main gallery content */}
      <div
        className="flex gap-6 focus:outline-2 focus:outline-[hsl(var(--border-muted))] focus:outline focus:rounded-md p-1"
        tabIndex={0}
        onFocus={() => console.log("Main gallery container focused")}
        ref={(el) => {
          // Auto focus the gallery container when it mounts
          if (el && typeof window !== "undefined") {
            setTimeout(() => {
              el.focus();
              console.log("Auto focusing gallery container");
            }, 100);
          }
        }}
        role="application"
        aria-label="Image gallery with keyboard navigation"
        onKeyDown={(e) => {
          console.log("Direct keydown on gallery container:", e.key);

          // Handle navigation with arrow keys
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            console.log(
              "Gallery container: Left arrow pressed - Previous image"
            );
            handlePrev();
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            console.log("Gallery container: Right arrow pressed - Next image");
            handleNext();
          } else if (e.shiftKey && e.key === "ArrowLeft") {
            e.preventDefault();
            console.log("Gallery container: Shift+Left - Previous page");
            handlePageChange(Math.max(1, currentPage - 1));
          } else if (e.shiftKey && e.key === "ArrowRight") {
            e.preventDefault();
            console.log("Gallery container: Shift+Right - Next page");
            handlePageChange(Math.min(totalPages, currentPage + 1));
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            console.log("Gallery container: Enter/Space - Opening modal");
            setModalIndex(mainIndex);
            setIsModalOpen(true);
          }
        }}
      >
        <div className="w-2/3">
          <div
            ref={mainImageRef}
            className={`sticky top-4 transition-all duration-150 ease-in-out ${
              isMainVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {isLoading ? (
              <div className="aspect-[4/3] w-full flex items-center justify-center rounded-lg bg-[hsl(var(--background-primary))] dark:bg-[hsl(var(--background-primary))] border border-[hsl(var(--border-muted))] dark:border-[hsl(var(--border-muted))] shadow-sm">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--foreground-muted))]" />
                  <p className="text-sm text-[hsl(var(--foreground-muted))]">
                    Loading images...
                  </p>
                </div>
              </div>
            ) : filteredImages.length > 0 ? (
              <>
                <button
                  ref={interactiveImageRef}
                  className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[hsl(var(--background-primary))] dark:bg-[hsl(var(--background-primary))] border border-[hsl(var(--border-muted))] dark:border-[hsl(var(--border-muted))] shadow-sm transition-shadow hover:shadow-md cursor-pointer focus:outline focus:outline-2 focus:outline-[hsl(var(--border-muted))]"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => {
                    console.log(
                      "ImageGallery: Main image button clicked - opening modal"
                    );
                    setModalIndex(mainIndex);
                    setIsModalOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      console.log(
                        "Main image Enter/Space pressed - opening modal"
                      );
                      setModalIndex(mainIndex);
                      setIsModalOpen(true);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`View image ${mainIndex + 1} of ${
                    filteredImages.length
                  } in fullscreen mode. Use arrow keys to navigate.`}
                  role="button"
                >
                  {!mainImageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--background-primary))]">
                      <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--foreground-muted))]" />
                    </div>
                  )}
                  <Image
                    src={optimizedImages[mainIndex]?.mainUrl}
                    alt={`Vehicle view ${mainIndex + 1} of ${
                      optimizedImages.length
                    }`}
                    className={`object-cover transition-opacity duration-300 ${
                      mainImageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    fill
                    sizes="100vw"
                    priority
                    onLoadingComplete={() => {
                      console.log(
                        `ImageGallery: Main image loaded for index ${mainIndex}`,
                        {
                          src: optimizedImages[mainIndex]?.mainUrl,
                        }
                      );
                      setMainImageLoaded(true);
                    }}
                    onError={() => {
                      console.error(
                        `ImageGallery: Error loading main image for index ${mainIndex}`,
                        {
                          src: optimizedImages[mainIndex]?.mainUrl,
                        }
                      );
                      // Still set as loaded to remove the loading spinner
                      setMainImageLoaded(true);
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(
                        "ImageGallery: Zoom button clicked - opening modal"
                      );
                      setModalIndex(mainIndex);
                      setIsModalOpen(true);
                    }}
                    className="absolute top-4 right-4 p-2 bg-[hsl(var(--background-primary))]/50 rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-primary))]/70 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2 z-10"
                    aria-label="Open fullscreen view"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[hsl(var(--background-primary))]/50 to-transparent" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(
                        "ImageGallery: Main view prev button clicked"
                      );
                      handlePrev();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-[hsl(var(--background-primary))]/50 rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-primary))]/70 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2 z-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(
                        "ImageGallery: Main view next button clicked"
                      );
                      handleNext();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-[hsl(var(--background-primary))]/50 rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-primary))]/70 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2 z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </button>
                <div className="mt-4 space-y-2 text-[hsl(var(--foreground-muted))]">
                  {filteredImages[mainIndex]?.metadata.description && (
                    <p className="text-sm">
                      {filteredImages[mainIndex].metadata.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {filteredImages[mainIndex]?.metadata.angle && (
                      <span className="px-2 py-1 rounded-full bg-[hsl(var(--background-muted))] text-[hsl(var(--foreground-muted))]">
                        Angle: {filteredImages[mainIndex].metadata.angle}
                      </span>
                    )}
                    {filteredImages[mainIndex]?.metadata.view && (
                      <span className="px-2 py-1 rounded-full bg-[hsl(var(--background-muted))] text-[hsl(var(--foreground-muted))]">
                        View: {filteredImages[mainIndex].metadata.view}
                      </span>
                    )}
                    {filteredImages[mainIndex]?.metadata.movement && (
                      <span className="px-2 py-1 rounded-full bg-[hsl(var(--background-muted))] text-[hsl(var(--foreground-muted))]">
                        Movement: {filteredImages[mainIndex].metadata.movement}
                      </span>
                    )}
                    {filteredImages[mainIndex]?.metadata.tod && (
                      <span className="px-2 py-1 rounded-full bg-[hsl(var(--background-muted))] text-[hsl(var(--foreground-muted))]">
                        Time of Day: {filteredImages[mainIndex].metadata.tod}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="aspect-[4/3] w-full flex items-center justify-center rounded-lg bg-[hsl(var(--background-muted))] dark:bg-[hsl(var(--background-primary))] text-muted-foreground">
                <p>No images match the selected filters</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-1/3">
          <div className="flex flex-col h-[calc(100vh-24rem)]">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--foreground-muted))]" />
                  <p className="text-sm text-[hsl(var(--foreground-muted))]">
                    Loading thumbnails...
                  </p>
                </div>
              </div>
            ) : filteredImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-x-1 gap-y-1 auto-rows-max overflow-y-auto">
                {paginatedImages.map((image, index) => {
                  const actualIndex = (currentPage - 1) * itemsPerPage + index;
                  return (
                    <div key={image.id} className="relative aspect-square">
                      <button
                        onClick={() => {
                          handleThumbnailClick(actualIndex);
                        }}
                        className={`w-full h-full relative transition-all duration-150 ease-in-out ${
                          actualIndex === mainIndex
                            ? "ring-2 ring-[hsl(var(--border-muted))]"
                            : "opacity-75 hover:opacity-100"
                        } focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2`}
                        aria-label={`View image ${actualIndex + 1}`}
                        aria-current={
                          actualIndex === mainIndex ? "true" : "false"
                        }
                      >
                        <div
                          id={`loader-${actualIndex}`}
                          className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--background-primary))]"
                          style={{
                            display: loadedThumbnailsRef.current.has(image.id)
                              ? "none"
                              : "flex",
                          }}
                        >
                          <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--foreground-muted))]" />
                        </div>
                        <Image
                          src={image.thumbnailUrl}
                          alt={`Thumbnail ${actualIndex + 1}`}
                          className="object-cover rounded-md"
                          fill
                          sizes="(max-width: 640px) 25vw, (max-width: 768px) 16.67vw, 12.5vw"
                          priority={actualIndex === mainIndex}
                          loading={
                            Math.abs(actualIndex - mainIndex) < 5
                              ? "eager"
                              : "lazy"
                          }
                          onLoadingComplete={() => {
                            // Log successful load
                            console.log(
                              `Thumbnail ${actualIndex} loaded successfully:`,
                              {
                                url: image.thumbnailUrl,
                                id: image.id,
                              }
                            );

                            // Mark this thumbnail as loaded to prevent reloading it
                            loadedThumbnailsRef.current.add(image.id);

                            // Hide the loader
                            const loaderElement = document.getElementById(
                              `loader-${actualIndex}`
                            );
                            if (loaderElement) {
                              loaderElement.style.display = "none";
                            }
                          }}
                          onError={() => {
                            console.error(
                              `Thumbnail ${actualIndex} failed to load:`,
                              {
                                url: image.thumbnailUrl,
                                id: image.id,
                              }
                            );
                          }}
                        />

                        {/* Set as thumbnail button - positioned outside the button but inside the wrapper div */}
                        {primaryImageId !== undefined && (
                          <button
                            className={`absolute bottom-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors z-10 ${
                              primaryImageId === image.id
                                ? "ring-2 ring-yellow-500"
                                : ""
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetAsThumbnail(image.id);
                            }}
                            disabled={updatingThumbnail === image.id}
                            title="Set as thumbnail"
                          >
                            {updatingThumbnail === image.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ImageIcon className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>No images match the selected filters</p>
              </div>
            )}

            {totalPages > 1 && filteredImages.length > 0 && (
              <div className="flex justify-center items-center gap-4 h-16 shrink-0 border-t border-[hsl(var(--border-muted))] dark:border-[hsl(var(--border-muted))]">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 bg-[hsl(var(--background-primary))]/50 rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-primary))]/70 transition-colors duration-150 ease-in-out disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2"
                  aria-label="Previous page"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (currentPage > 1) {
                        handlePageChange(currentPage - 1);
                      }
                    }
                  }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-[hsl(var(--foreground-muted))]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-[hsl(var(--background-primary))]/50 rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-primary))]/70 transition-colors duration-150 ease-in-out disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2"
                  aria-label="Next page"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (currentPage < totalPages) {
                        handlePageChange(currentPage + 1);
                      }
                    }
                  }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {isModalOpen && (
          <div
            className="fixed inset-0 bg-[hsl(var(--background-primary))]/90 dark:bg-[hsl(var(--background-primary))]/95 z-[9999] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Image gallery fullscreen view"
            onClick={(e) => {
              // Close modal when clicking outside the image
              if (e.target === e.currentTarget) {
                console.log(
                  "ImageGallery: Modal background clicked - closing modal"
                );
                setIsModalOpen(false);
              }
            }}
            onKeyDown={(e) => {
              console.log("Modal keydown:", e.key);
              if (e.key === "Escape") {
                e.preventDefault();
                console.log("Modal Escape key pressed - closing");
                setIsModalOpen(false);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                console.log("Modal Left arrow pressed - previous image");
                handlePrev();
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                console.log("Modal Right arrow pressed - next image");
                handleNext();
              }
            }}
            style={{ top: 0, left: 0, right: 0, bottom: 0, position: "fixed" }}
            tabIndex={-1} // Makes the container focusable but not in the tab order
          >
            <button
              onClick={() => {
                console.log("ImageGallery: Modal close button clicked");
                setIsModalOpen(false);
              }}
              className="absolute top-4 right-4 p-2 text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground-muted))] transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2"
              aria-label="Close fullscreen view"
              ref={(el) => {
                // Auto focus the close button when modal opens
                if (el && typeof window !== "undefined") {
                  setTimeout(() => el.focus(), 50);
                }
              }}
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center">
              <Image
                src={optimizedImages[modalIndex]?.mainUrl}
                alt={`Full size view ${modalIndex + 1} of ${
                  optimizedImages.length
                }`}
                className="max-w-full max-h-[90vh] object-contain"
                width={1200}
                height={800}
                sizes="100vw"
                priority
                onError={(e) => {
                  console.error(
                    "ImageGallery: Modal image failed to load:",
                    optimizedImages[modalIndex]?.mainUrl
                  );
                }}
                onLoadingComplete={() => {
                  console.log("ImageGallery: Modal image loaded successfully");
                }}
              />
            </div>
            <button
              onClick={() => {
                console.log("ImageGallery: Modal previous button clicked");
                handlePrev();
              }}
              className="absolute left-4 p-2 text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground-muted))] transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={() => {
                console.log("ImageGallery: Modal next button clicked");
                handleNext();
              }}
              className="absolute right-4 p-2 text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground-muted))] transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2"
              aria-label="Next image"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        )}
      </div>

      {/* Keyboard navigation help text */}
      <div className="text-xs text-[hsl(var(--foreground-muted))] text-center mt-2">
        <p>
          Keyboard navigation: Use{" "}
          <kbd className="px-1 py-0.5 bg-[hsl(var(--background-muted))] rounded">
            ←
          </kbd>{" "}
          and{" "}
          <kbd className="px-1 py-0.5 bg-[hsl(var(--background-muted))] rounded">
            →
          </kbd>{" "}
          to navigate images. Hold{" "}
          <kbd className="px-1 py-0.5 bg-[hsl(var(--background-muted))] rounded">
            Shift
          </kbd>{" "}
          + arrows to change pages.
        </p>
      </div>
    </div>
  );
};

export default ImageGalleryEnhanced;
