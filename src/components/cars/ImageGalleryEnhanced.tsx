"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Loader2,
  Image as ImageIcon,
  Filter,
} from "lucide-react";
import { transformImageUrl, imagePresets } from "@/lib/imageTransform";
import Image from "next/image";
import { toast } from "react-hot-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Replace focus removal styles with accessible focus styles
const accessibleFocusStyle = {
  outline: "2px solid hsl(var(--primary))",
  outlineOffset: "2px",
};

// Completely remove this style tag that removes focus outlines
// if (typeof document !== "undefined") {
//   const styleEl = document.createElement("style");
//   styleEl.textContent = `
//     .focus-outline-none *:focus {
//       outline: none !important;
//       box-shadow: none !important;
//     }
//   `;
//   document.head.appendChild(styleEl);
// }

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
  isLoading?: boolean;
  carId?: string;
  primaryImageId?: string;
  onPrimaryImageChange?: (imageId: string) => void;
  activeFilters?: {
    angle?: string;
    view?: string;
    movement?: string;
    tod?: string;
    side?: string;
  };
  onFilterChange?: (filterType: string, value: string) => void;
  onFilterOptionsChange?: (options: {
    angles: string[];
    views: string[];
    movements: string[];
    tods: string[];
    sides: string[];
  }) => void;
  onResetFilters?: () => void;
}

export const ImageGalleryEnhanced: React.FC<ImageGalleryProps> = ({
  images,
  isLoading = false,
  carId,
  primaryImageId,
  onPrimaryImageChange,
  activeFilters: externalActiveFilters,
  onFilterChange,
  onFilterOptionsChange,
  onResetFilters,
}) => {
  // Use internal filter state if no external state is provided
  const [internalActiveFilters, setInternalActiveFilters] = useState<{
    angle?: string;
    view?: string;
    movement?: string;
    tod?: string;
    side?: string;
  }>({});

  // Use either external filters or internal filters
  const activeFilters = externalActiveFilters || internalActiveFilters;

  // Function to handle filter changes - either call external handler or update internal state
  const handleFilterChange = (filterType: string, value: string) => {
    if (onFilterChange) {
      // Use external handler
      onFilterChange(filterType, value);
    } else {
      // Use internal state
      setInternalActiveFilters((prev) => ({
        ...prev,
        [filterType]:
          value === prev[filterType as keyof typeof prev] ? undefined : value,
      }));
    }
  };

  // Function to reset filters - either call external handler or update internal state
  const handleResetFilters = () => {
    if (onResetFilters) {
      // Use external handler
      onResetFilters();
    } else {
      // Use internal state
      setInternalActiveFilters({});
    }
  };

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

  // Deduplicate images by ID while maintaining original order
  const sortedImages = React.useMemo(() => {
    console.log("Recomputing sortedImages with", images.length, "input images");

    // Create a Set to track seen IDs
    const seenIds = new Set<string>();

    // Filter out duplicates while maintaining order
    const dedupedImages = images.filter((img) => {
      if (seenIds.has(img.id)) {
        return false;
      }
      seenIds.add(img.id);
      return true;
    });

    console.log(
      "Deduped image IDs (first 3):",
      dedupedImages.slice(0, 3).map((img) => img.id)
    );

    return dedupedImages;
  }, [images]); // Only depend on images array

  // State declarations
  const [mainIndex, setMainIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMainVisible, setIsMainVisible] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const [updatingThumbnail, setUpdatingThumbnail] = useState<string | null>(
    null
  );
  // Track the currently viewed image by ID, not just index - moved this to the top with other state declarations
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);
  // Add a flag to prevent loops when programmatically changing index
  const isChangingFromImageIdRef = useRef(false);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const interactiveImageRef = useRef<HTMLButtonElement>(null);
  const imagesPerRow = 3;
  const rowsPerPage = 5;
  const itemsPerPage = imagesPerRow * rowsPerPage;
  const loadedThumbnailsRef = useRef<Set<string>>(new Set());

  // Find the index of the primary image - ONLY ON INITIAL LOAD
  const [hasSetInitialImage, setHasSetInitialImage] = useState(false);

  // Add this state variable to track user interactions
  const [userHasSelectedImage, setUserHasSelectedImage] = useState(false);

  // When mainIndex changes, update currentImageId
  useEffect(() => {
    // Skip this effect if the change was triggered by the image ID effect
    if (isChangingFromImageIdRef.current) {
      isChangingFromImageIdRef.current = false;
      return;
    }

    if (sortedImages.length > 0 && mainIndex < sortedImages.length) {
      const newImageId = sortedImages[mainIndex].id;
      // Only update if different to prevent loops
      if (newImageId !== currentImageId) {
        setCurrentImageId(newImageId);
      }
    }
  }, [mainIndex, sortedImages, currentImageId]);

  // Force reset the component state when images array changes
  useEffect(() => {
    console.log("Images array changed, preserving selection where possible");

    // Don't reset the main index or current page - maintain the current view
    // Only reset loaded state to prevent stale thumbnails
    setMainImageLoaded(false);
    setImagesLoaded(false);
    loadedThumbnailsRef.current = new Set();

    // Don't reset hasSetInitialImage - keep the selected image
  }, [images]);

  console.log(
    "ImageGalleryEnhanced: Rendering with",
    sortedImages.length,
    "images after deduplication"
  );

  useEffect(() => {
    console.log("ImageGalleryEnhanced: primaryImageId effect triggered", {
      primaryImageId,
      imagesCount: sortedImages.length,
      hasSetInitialImage,
      userHasSelectedImage,
    });

    // Only set the primary image on initial load or when primaryImageId explicitly changes
    // AND only if the user hasn't manually selected an image
    if (primaryImageId && !hasSetInitialImage && !userHasSelectedImage) {
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
  }, [primaryImageId, sortedImages, hasSetInitialImage, userHasSelectedImage]);

  // Reset image loaded state when images change
  useEffect(() => {
    setImagesLoaded(false);
    setMainImageLoaded(false);
  }, [images]);

  // Get unique filter values
  const filterOptions = React.useMemo(() => {
    console.log("Computing filter options from", sortedImages.length, "images");

    // Debug log the first few images' metadata
    if (sortedImages.length > 0) {
      console.log(
        "Sample image metadata:",
        sortedImages.slice(0, 3).map((img) => img.metadata)
      );
    }

    // Invalid values to skip (case-insensitive)
    const invalidValues = [
      "not applicable",
      "n/a",
      "na",
      "none",
      "not specified",
      "unknown",
      "undefined",
      "null",
      "",
    ];

    // Helper function to normalize metadata values
    const normalizeValue = (value: string | undefined): string | null => {
      if (!value) return null;

      const trimmedValue = value.trim();
      if (trimmedValue === "") return null;

      // Check against invalid values (case-insensitive)
      if (
        invalidValues.some(
          (invalid) => trimmedValue.toLowerCase() === invalid.toLowerCase()
        )
      ) {
        return null;
      }

      // Return the original casing, but trimmed
      return trimmedValue;
    };

    // Process each image
    const result = sortedImages.reduce(
      (acc, img) => {
        // Process angle
        const normalizedAngle = normalizeValue(img.metadata.angle);
        if (normalizedAngle && !acc.angles.includes(normalizedAngle)) {
          acc.angles.push(normalizedAngle);
        }

        // Process view
        const normalizedView = normalizeValue(img.metadata.view);
        if (normalizedView && !acc.views.includes(normalizedView)) {
          acc.views.push(normalizedView);
        }

        // Process movement
        const normalizedMovement = normalizeValue(img.metadata.movement);
        if (normalizedMovement && !acc.movements.includes(normalizedMovement)) {
          acc.movements.push(normalizedMovement);
        }

        // Process time of day
        const normalizedTod = normalizeValue(img.metadata.tod);
        if (normalizedTod && !acc.tods.includes(normalizedTod)) {
          acc.tods.push(normalizedTod);
        }

        // Process side
        const normalizedSide = normalizeValue(img.metadata.side);
        if (normalizedSide && !acc.sides.includes(normalizedSide)) {
          acc.sides.push(normalizedSide);
        }

        return acc;
      },
      { angles: [], views: [], movements: [], tods: [], sides: [] } as {
        angles: string[];
        views: string[];
        movements: string[];
        tods: string[];
        sides: string[];
      }
    );

    // Sort all arrays alphabetically
    result.angles.sort();
    result.views.sort();
    result.movements.sort();
    result.tods.sort();
    result.sides.sort();

    console.log("Extracted filter options:", result);
    return result;
  }, [sortedImages]);

  // Track previous image count to only notify parent when it changes
  const prevImagesCountRef = useRef(sortedImages.length);

  // Track previous filter options to avoid infinite loops
  const prevFilterOptionsRef = useRef<typeof filterOptions | null>(null);

  // Notify parent of filter options only when filter options actually change
  React.useEffect(() => {
    console.log("Filter options effect triggered");

    // Skip if filterOptions haven't changed from the previous value
    const optionsJSON = JSON.stringify(filterOptions);
    const prevOptionsJSON = prevFilterOptionsRef.current
      ? JSON.stringify(prevFilterOptionsRef.current)
      : null;

    // Only notify parent when options actually change
    if (onFilterOptionsChange && optionsJSON !== prevOptionsJSON) {
      console.log("Notifying parent of filter options:", filterOptions);
      onFilterOptionsChange(filterOptions);

      // Update the previous value reference
      prevFilterOptionsRef.current = filterOptions;
    }
  }, [filterOptions, onFilterOptionsChange]);

  // Filter images based on active filters
  const filteredImages = React.useMemo(() => {
    console.log(
      "Recalculating filteredImages with",
      sortedImages.length,
      "sorted images"
    );

    // If we don't have any active filters, return all images
    if (
      Object.keys(activeFilters).every(
        (key) => !activeFilters[key as keyof typeof activeFilters]
      )
    ) {
      console.log(
        "No active filters, returning all",
        sortedImages.length,
        "images"
      );
      return sortedImages;
    }

    // Apply filters
    const results = sortedImages.filter((img) => {
      return Object.entries(activeFilters).every(([key, value]) => {
        if (!value) return true;
        return img.metadata[key as keyof typeof img.metadata] === value;
      });
    });

    console.log("After applying filters, have", results.length, "images");

    // If filtering resulted in no images, return all images instead of an empty array
    if (results.length === 0 && sortedImages.length > 0) {
      console.log(
        "WARNING: Filtering resulted in 0 images - returning all images instead"
      );
      return sortedImages;
    }

    return results;
  }, [sortedImages, activeFilters]);

  // Add debug log for filtered images
  console.log("Filtering results:", {
    beforeFiltering: sortedImages.length,
    afterFiltering: filteredImages.length,
    activeFilters,
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
      // Mark that the user has manually navigated
      setUserHasSelectedImage(true);

      // Force image reload when advancing to next image
      setMainImageLoaded(false);
      const newIndex = (mainIndex + 1) % optimizedImages.length;
      console.log(
        `ImageGallery: handleNext - changing from ${mainIndex} to ${newIndex}`,
        {
          totalImages: optimizedImages.length,
          newImageId: optimizedImages[newIndex]?.id,
        }
      );
      setMainIndex(newIndex);
      // Update currentImageId to match the new index
      if (optimizedImages[newIndex]) {
        setCurrentImageId(optimizedImages[newIndex].id);
      }
    }
  }, [
    isModalOpen,
    optimizedImages.length,
    modalIndex,
    mainIndex,
    optimizedImages,
  ]);

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
      // Mark that the user has manually navigated
      setUserHasSelectedImage(true);

      // Force image reload when going to previous image
      setMainImageLoaded(false);
      const newIndex =
        (mainIndex - 1 + optimizedImages.length) % optimizedImages.length;
      console.log(
        `ImageGallery: handlePrev - changing from ${mainIndex} to ${newIndex}`,
        {
          totalImages: optimizedImages.length,
          newImageId: optimizedImages[newIndex]?.id,
        }
      );
      setMainIndex(newIndex);
      // Update currentImageId to match the new index
      if (optimizedImages[newIndex]) {
        setCurrentImageId(optimizedImages[newIndex].id);
      }
    }
  }, [
    isModalOpen,
    optimizedImages.length,
    modalIndex,
    mainIndex,
    optimizedImages,
  ]);

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

        // Mark that user has manually changed page when using pagination controls
        setUserHasSelectedImage(true);

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

  // Add focus trap and management for the modal
  useEffect(() => {
    if (!isModalOpen) return;

    console.log("ImageGallery: Modal opened, setting up focus trap");

    // Store the element that had focus before opening modal
    const previouslyFocused = document.activeElement as HTMLElement;

    // Find focusable elements in modal
    const modal = document.querySelector(".image-modal");
    if (modal) {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      // Focus the first element in the modal
      if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 100);
      }

      // Handle tab to trap focus
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === "Tab") {
          // If shift+tab on first element, go to last element
          if (e.shiftKey && document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
          // If tab on last element, go to first element
          else if (!e.shiftKey && document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      };

      document.addEventListener("keydown", handleTabKey);

      // Clean up
      return () => {
        document.removeEventListener("keydown", handleTabKey);

        // Restore focus when modal closes
        if (previouslyFocused) {
          console.log("ImageGallery: Modal closed, restoring focus");
          previouslyFocused.focus();
        }
      };
    }

    // Fallback return if no modal
    return () => {
      if (previouslyFocused) {
        console.log("ImageGallery: Modal closed, restoring focus");
        previouslyFocused.focus();
      }
    };
  }, [isModalOpen]);

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

  // Completely rewrite the handleThumbnailClick function to avoid the back-and-forth issue
  const handleThumbnailClick = useCallback(
    (actualIndex: number) => {
      console.log("ImageGallery: Thumbnail click handler called", {
        actualIndex,
        currentMainIndex: mainIndex,
        imageId: optimizedImages[actualIndex]?.id,
        totalImages: optimizedImages.length,
      });

      // Mark that the user has manually selected an image
      setUserHasSelectedImage(true);

      // If this is already the selected image, open the modal
      if (actualIndex === mainIndex) {
        console.log(
          `ImageGallery: Thumbnail already selected, opening modal for index ${actualIndex}`
        );
        setModalIndex(actualIndex);
        setIsModalOpen(true);
        return;
      }

      console.log(
        `ImageGallery: Thumbnail clicked, updating mainIndex from ${mainIndex} to ${actualIndex}`
      );

      // First reset the image loaded state
      setMainImageLoaded(false);

      // Update the mainIndex immediately
      setMainIndex(actualIndex);

      // Also update the currentImageId
      if (optimizedImages[actualIndex]) {
        setCurrentImageId(optimizedImages[actualIndex].id);
      }
    },
    [
      mainIndex,
      optimizedImages,
      setModalIndex,
      setIsModalOpen,
      setMainIndex,
      setCurrentImageId,
      setMainImageLoaded,
    ]
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

  // Enhanced version of the useEffect for image array changes
  useEffect(() => {
    // This is a separate effect to handle image array changes
    const imageCount = images.length;
    console.log(
      `ImageGalleryEnhanced: Images array changed - new count: ${imageCount}`
    );

    if (imageCount > 0) {
      let newMainIndex = mainIndex; // Default to current image index
      let shouldUpdateIndex = false;

      // Try to maintain the same image by ID when switching modes
      if (currentImageId) {
        const currentImageIndex = images.findIndex(
          (img) => img.id === currentImageId
        );
        if (currentImageIndex >= 0) {
          console.log(`Maintaining view of current image ID ${currentImageId}`);
          newMainIndex = currentImageIndex;
          shouldUpdateIndex = true;
        }
      }
      // If current image not found, try using primary image but only if user hasn't manually selected an image
      else if (primaryImageId && !hasSetInitialImage && !userHasSelectedImage) {
        const primaryIndex = images.findIndex(
          (img) => img.id === primaryImageId
        );
        if (primaryIndex >= 0) {
          console.log(
            `Setting main index to primary image at index ${primaryIndex}`
          );
          newMainIndex = primaryIndex;
          shouldUpdateIndex = true;
        }
      }

      // Only update mainIndex if we actually found a matching image
      if (shouldUpdateIndex) {
        // Set flag to prevent circular updates
        isChangingFromImageIdRef.current = true;

        // Set the main index to maintain image selection across mode switches
        setMainIndex(newMainIndex);

        // Calculate correct page for selected image
        const newPage = Math.floor(newMainIndex / itemsPerPage) + 1;
        setCurrentPage(newPage);
      }

      // Add small delay before marking image as loaded to prevent flickering
      setMainImageLoaded(false);
      setTimeout(() => {
        setHasSetInitialImage(true);
      }, 50);
    }
  }, [
    images,
    primaryImageId,
    currentImageId,
    itemsPerPage,
    mainIndex,
    userHasSelectedImage,
    hasSetInitialImage,
  ]);

  // Add fade-in transition to the main image container to smooth transitions
  const mainImageContainerStyle = {
    ...accessibleFocusStyle,
    transition: "opacity 0.2s ease-in-out",
  };

  // Add a cleanup effect for any keyboard handlers
  useEffect(() => {
    return () => {
      // Any cleanup needed
    };
  }, []);

  // Add this at the top of the component, with other state and refs
  const mainImageContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="space-y-6 focus-outline-none focus-visible:outline-none"
      key="image-gallery-enhanced-stable"
    >
      {/* Main gallery content */}
      <div
        className="flex gap-6 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 image-gallery-wrapper"
        role="application"
        aria-label="Image gallery with keyboard navigation"
        tabIndex={0}
        onFocus={() => console.log("Gallery container focused")}
        onKeyDown={(e) => {
          // Don't handle keyboard events if we're in an input element
          if (
            document.activeElement?.tagName === "INPUT" ||
            document.activeElement?.tagName === "TEXTAREA" ||
            document.activeElement?.getAttribute("contenteditable") === "true"
          ) {
            return;
          }

          console.log("Gallery keydown:", e.key);

          // Handle escape to close modal first
          if (e.key === "Escape" && isModalOpen) {
            e.preventDefault();
            setIsModalOpen(false);
            return;
          }

          // Handle all navigation with switch for cleaner code
          switch (e.key) {
            case "ArrowLeft":
              e.preventDefault();
              e.stopPropagation();
              handlePrev();
              break;

            case "ArrowRight":
              e.preventDefault();
              e.stopPropagation();
              handleNext();
              break;

            case "Enter":
            case " ":
              e.preventDefault();
              e.stopPropagation();
              if (!isModalOpen) {
                setModalIndex(mainIndex);
                setIsModalOpen(true);
              }
              break;

            case "Home":
            case "PageUp":
              e.preventDefault();
              e.stopPropagation();
              handlePageChange(1);
              setMainIndex(0);
              if (optimizedImages[0]) {
                setCurrentImageId(optimizedImages[0].id);
              }
              break;

            case "End":
            case "PageDown":
              e.preventDefault();
              e.stopPropagation();
              const lastPage = Math.ceil(optimizedImages.length / itemsPerPage);
              handlePageChange(lastPage);
              const lastIndex = optimizedImages.length - 1;
              setMainIndex(lastIndex);
              if (optimizedImages[lastIndex]) {
                setCurrentImageId(optimizedImages[lastIndex].id);
              }
              break;
          }
        }}
      >
        <div className="w-2/3">
          <div
            ref={mainImageRef}
            className={`flex-1 flex flex-col ${
              isMainVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {filteredImages.length > 0 ? (
              <>
                <button
                  ref={interactiveImageRef}
                  onClick={() => {
                    console.log(
                      "ImageGallery: Main image clicked - opening modal"
                    );
                    setModalIndex(mainIndex);
                    setIsModalOpen(true);
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  className="relative w-full bg-[hsl(var(--background-muted))] rounded-md overflow-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 flex justify-center items-center"
                  style={{
                    minHeight: "400px",
                    maxHeight: "calc(100vh - 300px)",
                  }}
                  aria-label={`View image of ${
                    filteredImages[mainIndex]?.metadata?.description || "car"
                  } in fullscreen mode. Use arrow keys to navigate.`}
                  role="button"
                  tabIndex={0}
                >
                  {!mainImageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--foreground-muted))]" />
                    </div>
                  )}
                  <Image
                    src={filteredImages[mainIndex]?.url}
                    alt={
                      filteredImages[mainIndex]?.metadata?.description ||
                      `Car image ${mainIndex + 1}`
                    }
                    className="max-w-full max-h-full"
                    width={1200}
                    height={800}
                    priority={true}
                    onLoadingComplete={() => {
                      console.log("Main image loaded successfully:");
                      setMainImageLoaded(true);
                    }}
                    onError={() => {
                      console.error("Main image failed to load");
                      setMainImageLoaded(true); // Still set to true to hide the loader
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
                    className="absolute top-4 right-4 p-2 bg-[hsl(var(--background-primary))]/50 rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-primary))]/70 transition-colors duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Open fullscreen view"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log(
                        "ImageGallery: Main view prev button clicked"
                      );
                      handlePrev();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-[hsl(var(--background-primary))]/50 rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-primary))]/70 transition-colors duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log(
                        "ImageGallery: Main view next button clicked"
                      );
                      handleNext();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-[hsl(var(--background-primary))]/50 rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-primary))]/70 transition-colors duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
                <p>No images match the selected filters</p>
                {Object.keys(activeFilters).length > 0 && (
                  <button
                    onClick={handleResetFilters}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="w-1/3">
          {/* Active filters display - moved near the thumbnails */}
          {Object.keys(activeFilters).length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mb-2 p-2 bg-[hsl(var(--background-subtle))] rounded-md">
              <span className="text-xs text-[hsl(var(--foreground-muted))]">
                Filters:
              </span>
              {Object.entries(activeFilters).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => handleFilterChange(key, value)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {key}: {value}
                  <X className="w-3 h-3" />
                </button>
              ))}
              <button
                onClick={handleResetFilters}
                className="ml-auto px-2 py-1 text-xs rounded-full bg-[hsl(var(--background-muted))] text-[hsl(var(--foreground-muted))] hover:bg-[hsl(var(--background-subtle))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                Clear
              </button>
            </div>
          )}

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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleThumbnailClick(actualIndex);
                        }}
                        className={`thumbnail-button w-full h-full relative transition-all duration-150 ease-in-out ${
                          actualIndex === mainIndex
                            ? "ring-2 ring-[hsl(var(--border-muted))]"
                            : "opacity-75 hover:opacity-100"
                        } focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                        aria-label={`View image ${actualIndex + 1}`}
                        aria-current={
                          actualIndex === mainIndex ? "true" : "false"
                        }
                        tabIndex={0}
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
                            className={`absolute bottom-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
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
                  className="p-2 bg-[hsl(var(--background-primary))]/50 rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-primary))]/70 transition-colors duration-150 ease-in-out disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-[hsl(var(--foreground-muted))]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-[hsl(var(--background-primary))]/50 rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-primary))]/70 transition-colors duration-150 ease-in-out disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
            className="image-modal fixed inset-0 bg-[hsl(var(--background-primary))]/90 dark:bg-[hsl(var(--background-primary))]/95 z-[9999] flex items-center justify-center"
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
            tabIndex={-1} // Makes the container focusable but not in the tab order
          >
            <button
              onClick={() => {
                console.log("ImageGallery: Modal close button clicked");
                setIsModalOpen(false);
              }}
              className="absolute top-4 right-4 p-2 text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground-muted))] transition-colors duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Close fullscreen view"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative flex items-center justify-center p-4">
              <Image
                src={
                  optimizedImages[modalIndex]?.url ||
                  filteredImages[modalIndex]?.url
                }
                alt={`Full size view ${modalIndex + 1} of ${
                  optimizedImages.length
                }`}
                className="max-w-[90vw] max-h-[90vh]"
                width={1600}
                height={1200}
                priority
                onError={(e) => {
                  console.error(
                    "ImageGallery: Modal image failed to load:",
                    optimizedImages[modalIndex]?.url
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
              className="absolute left-4 p-2 text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground-muted))] transition-colors duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={() => {
                console.log("ImageGallery: Modal next button clicked");
                handleNext();
              }}
              className="absolute right-4 p-2 text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground-muted))] transition-colors duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Next image"
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            {/* Caption or metadata display in modal */}
            {filteredImages[modalIndex]?.metadata?.description && (
              <div className="absolute bottom-4 left-0 right-0 text-center bg-[hsl(var(--background-primary))]/75 p-2 text-[hsl(var(--foreground))]">
                {filteredImages[modalIndex].metadata.description}
              </div>
            )}
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

// Export the filter button separately to be used in the parent component
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
  console.log("ImageFilterButton render with options:", filterOptions);

  // Control the open state of the popover manually
  const [open, setOpen] = React.useState(false);

  // Handle filter change without causing multiple renders
  const handleFilterChange = React.useCallback(
    (type: string, value: string) => {
      console.log(`Filter change: ${type} = ${value}`);
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
