"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, Loader2 } from "lucide-react";
import { transformImageUrl, imagePresets } from "@/lib/imageTransform";
import Image from "next/image";

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
}

export const ImageGalleryEnhanced: React.FC<ImageGalleryProps> = ({
  images,
  isLoading = false,
}) => {
  // Sort images by filename
  const sortedImages = [...images].sort((a, b) =>
    a.filename.localeCompare(b.filename)
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
  const mainImageRef = useRef<HTMLDivElement>(null);
  const imagesPerRow = 3;
  const rowsPerPage = 5;

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

  const itemsPerPage = imagesPerRow * rowsPerPage;
  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    if (filteredImages.length > 0) {
      setMainIndex(0);
    }
  }, [activeFilters]);

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

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
        // Set mainIndex to first image of the new page
        const newMainIndex = (newPage - 1) * itemsPerPage;
        if (newMainIndex < filteredImages.length) {
          setMainIndex(newMainIndex);
        }
      }
    },
    [totalPages, itemsPerPage, filteredImages.length]
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
      // Handle Shift + Arrow combinations first
      if (e.shiftKey) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          handlePageChange(Math.max(1, currentPage - 1));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          handlePageChange(Math.min(totalPages, currentPage + 1));
        }
        return;
      }

      // Handle regular arrow keys
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        if (e.key === "ArrowLeft") {
          handlePrev();
        } else {
          handleNext();
        }
      }

      // Handle escape key for modal
      if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
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
  ]);

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

  const paginatedImages = filteredImages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
              {filterOptions.angles.map((angle) => (
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
              {filterOptions.views.map((view) => (
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
              {filterOptions.movements.map((movement) => (
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
              {filterOptions.tods.map((tod) => (
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
      <div className="flex gap-6" tabIndex={0}>
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
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[hsl(var(--background-primary))] dark:bg-[hsl(var(--background-primary))] border border-[hsl(var(--border-muted))] dark:border-[hsl(var(--border-muted))] shadow-sm transition-shadow hover:shadow-md"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  {!mainImageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--background-primary))]">
                      <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--foreground-muted))]" />
                    </div>
                  )}
                  <Image
                    src={filteredImages[mainIndex]?.url}
                    alt={`Vehicle view ${mainIndex + 1} of ${
                      filteredImages.length
                    }`}
                    className={`object-cover transition-opacity duration-300 ${
                      mainImageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    fill
                    sizes="100vw"
                    priority
                    onLoad={() => setMainImageLoaded(true)}
                  />
                  <button
                    onClick={() => {
                      setModalIndex(mainIndex);
                      setIsModalOpen(true);
                    }}
                    className="absolute top-4 right-4 p-2 bg-[hsl(var(--background-primary))]/50 rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-primary))]/70 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2"
                    aria-label="Open fullscreen view"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[hsl(var(--background-primary))]/50 to-transparent" />
                  <button
                    onClick={handlePrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-[hsl(var(--background-primary))]/50 rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-primary))]/70 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-[hsl(var(--background-primary))]/50 rounded-full text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background-primary))]/70 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
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
                    <button
                      key={actualIndex}
                      onClick={() => {
                        setMainIndex(actualIndex);
                        setMainImageLoaded(false);
                      }}
                      className={`aspect-square relative transition-all duration-150 ease-in-out ${
                        actualIndex === mainIndex
                          ? "ring-2 ring-[hsl(var(--border-muted))]"
                          : "opacity-75 hover:opacity-100"
                      } focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2`}
                      aria-label={`View image ${actualIndex + 1}`}
                      aria-current={
                        actualIndex === mainIndex ? "true" : "false"
                      }
                    >
                      <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--background-primary))]">
                        <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--foreground-muted))]" />
                      </div>
                      <Image
                        src={image.url.replace("/public", "/width=200")}
                        alt={`Thumbnail ${actualIndex + 1}`}
                        className="object-cover rounded-md"
                        fill
                        sizes="(max-width: 640px) 25vw, (max-width: 768px) 16.67vw, 12.5vw"
                        onLoad={(e) => {
                          // Hide the loader when image loads
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            const loader = parent.querySelector("div");
                            if (loader) loader.style.display = "none";
                          }
                        }}
                      />
                    </button>
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
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {isModalOpen && (
          <div
            className="fixed inset-0 bg-[hsl(var(--background-primary))]/90 dark:bg-[hsl(var(--background-primary))]/95 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Image gallery"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground-muted))] transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2"
              aria-label="Close fullscreen view"
            >
              <X className="w-6 h-6" />
            </button>
            <Image
              src={filteredImages[modalIndex]?.url}
              alt={`Full size view ${modalIndex + 1} of ${
                filteredImages.length
              }`}
              className="max-w-full max-h-[90vh] object-contain"
              fill
              sizes="100vw"
              priority
            />
            <button
              onClick={handlePrev}
              className="absolute left-4 p-2 text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground-muted))] transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 p-2 text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground-muted))] transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--border-muted))] focus:ring-offset-2"
              aria-label="Next image"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGalleryEnhanced;
