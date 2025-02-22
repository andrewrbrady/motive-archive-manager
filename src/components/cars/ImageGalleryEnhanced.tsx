"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
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
}

export const ImageGalleryEnhanced: React.FC<ImageGalleryProps> = ({
  images,
}) => {
  const [mainIndex, setMainIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMainVisible, setIsMainVisible] = useState(true);
  const [activeFilters, setActiveFilters] = useState<{
    angle?: string;
    view?: string;
    movement?: string;
    tod?: string;
  }>({});
  const mainImageRef = useRef<HTMLDivElement>(null);
  const imagesPerRow = 3;
  const rowsPerPage = 5;

  // Get unique filter values
  const filterOptions = images.reduce(
    (acc, img) => {
      if (img.metadata.angle && !acc.angles.includes(img.metadata.angle)) {
        acc.angles.push(img.metadata.angle);
      }
      if (img.metadata.view && !acc.views.includes(img.metadata.view)) {
        acc.views.push(img.metadata.view);
      }
      if (
        img.metadata.movement &&
        !acc.movements.includes(img.metadata.movement)
      ) {
        acc.movements.push(img.metadata.movement);
      }
      if (img.metadata.tod && !acc.tods.includes(img.metadata.tod)) {
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
  const filteredImages = images.filter((img) => {
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
      <div className="flex flex-wrap gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        {filterOptions.angles.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Angle
            </h3>
            <div className="flex flex-wrap gap-2">
              {filterOptions.angles.map((angle) => (
                <button
                  key={angle}
                  onClick={() => handleFilterChange("angle", angle)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors duration-150 ease-in-out ${
                    activeFilters.angle === angle
                      ? "bg-[var(--background-tertiary)] text-white"
                      : "bg-[var(--background-secondary)] dark:bg-[var(--background-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-disabled)] hover:bg-[var(--background-tertiary)] dark:hover:bg-[var(--background-tertiary)]"
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
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              View
            </h3>
            <div className="flex flex-wrap gap-2">
              {filterOptions.views.map((view) => (
                <button
                  key={view}
                  onClick={() => handleFilterChange("view", view)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors duration-150 ease-in-out ${
                    activeFilters.view === view
                      ? "bg-[var(--background-tertiary)] text-white"
                      : "bg-[var(--background-secondary)] dark:bg-[var(--background-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-disabled)] hover:bg-[var(--background-tertiary)] dark:hover:bg-[var(--background-tertiary)]"
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
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Movement
            </h3>
            <div className="flex flex-wrap gap-2">
              {filterOptions.movements.map((movement) => (
                <button
                  key={movement}
                  onClick={() => handleFilterChange("movement", movement)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors duration-150 ease-in-out ${
                    activeFilters.movement === movement
                      ? "bg-[var(--background-tertiary)] text-white"
                      : "bg-[var(--background-secondary)] dark:bg-[var(--background-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-disabled)] hover:bg-[var(--background-tertiary)] dark:hover:bg-[var(--background-tertiary)]"
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
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Time of Day
            </h3>
            <div className="flex flex-wrap gap-2">
              {filterOptions.tods.map((tod) => (
                <button
                  key={tod}
                  onClick={() => handleFilterChange("tod", tod)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors duration-150 ease-in-out ${
                    activeFilters.tod === tod
                      ? "bg-[var(--background-tertiary)] text-white"
                      : "bg-[var(--background-secondary)] dark:bg-[var(--background-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-disabled)] hover:bg-[var(--background-tertiary)] dark:hover:bg-[var(--background-tertiary)]"
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
            {filteredImages.length > 0 ? (
              <>
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[var(--background-secondary)] dark:bg-[var(--background-secondary)] shadow-sm dark:shadow-md transition-shadow hover:shadow-md dark:hover:shadow-lg"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <Image
                    src={`${filteredImages[mainIndex]?.url.replace(
                      "/public",
                      ""
                    )}/public`}
                    alt={`Vehicle view ${mainIndex + 1} of ${
                      filteredImages.length
                    }`}
                    className="object-cover"
                    fill
                    sizes="100vw"
                    priority
                  />
                  <button
                    onClick={() => {
                      setModalIndex(mainIndex);
                      setIsModalOpen(true);
                    }}
                    className="absolute top-4 right-4 p-2 bg-black/50 dark:bg-white/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-white/20 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 dark:focus:ring-offset-[var(--background-primary)]"
                    aria-label="Open fullscreen view"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
                  <button
                    onClick={handlePrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 dark:bg-white/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-white/20 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 dark:focus:ring-offset-[var(--background-primary)]"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 dark:bg-white/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-white/20 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 dark:focus:ring-offset-[var(--background-primary)]"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-4 space-y-2 text-[var(--text-secondary)] dark:text-[var(--text-disabled)]">
                  {filteredImages[mainIndex]?.metadata.description && (
                    <p className="text-sm">
                      {filteredImages[mainIndex].metadata.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {filteredImages[mainIndex]?.metadata.angle && (
                      <span className="px-2 py-1 rounded-full bg-[var(--background-secondary)] dark:bg-[var(--background-secondary)]">
                        Angle: {filteredImages[mainIndex].metadata.angle}
                      </span>
                    )}
                    {filteredImages[mainIndex]?.metadata.view && (
                      <span className="px-2 py-1 rounded-full bg-[var(--background-secondary)] dark:bg-[var(--background-secondary)]">
                        View: {filteredImages[mainIndex].metadata.view}
                      </span>
                    )}
                    {filteredImages[mainIndex]?.metadata.movement && (
                      <span className="px-2 py-1 rounded-full bg-[var(--background-secondary)] dark:bg-[var(--background-secondary)]">
                        Movement: {filteredImages[mainIndex].metadata.movement}
                      </span>
                    )}
                    {filteredImages[mainIndex]?.metadata.tod && (
                      <span className="px-2 py-1 rounded-full bg-[var(--background-secondary)] dark:bg-[var(--background-secondary)]">
                        Time of Day: {filteredImages[mainIndex].metadata.tod}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="aspect-[4/3] w-full flex items-center justify-center rounded-lg bg-[var(--background-secondary)] dark:bg-[var(--background-secondary)] text-[var(--text-secondary)] dark:text-[var(--text-disabled)]">
                <p>No images match the selected filters</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-1/3">
          <div className="flex flex-col h-[calc(100vh-24rem)]">
            {filteredImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-x-1 gap-y-1 auto-rows-max overflow-y-auto">
                {paginatedImages.map((image, index) => {
                  const actualIndex = (currentPage - 1) * itemsPerPage + index;
                  return (
                    <button
                      key={actualIndex}
                      onClick={() => setMainIndex(actualIndex)}
                      className={`aspect-square relative transition-all duration-150 ease-in-out ${
                        actualIndex === mainIndex
                          ? "ring-2 ring-[var(--background-tertiary)] dark:ring-[var(--background-tertiary)]"
                          : "opacity-75 hover:opacity-100"
                      } focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 dark:focus:ring-offset-[var(--background-primary)]`}
                      aria-label={`View image ${actualIndex + 1}`}
                      aria-current={
                        actualIndex === mainIndex ? "true" : "false"
                      }
                    >
                      <Image
                        src={`${image.url.replace("/public", "")}/width=200`}
                        alt={`Thumbnail ${actualIndex + 1}`}
                        className="object-cover rounded-md"
                        fill
                        sizes="(max-width: 640px) 25vw, (max-width: 768px) 16.67vw, 12.5vw"
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)] dark:text-[var(--text-disabled)]">
                <p>No images match the selected filters</p>
              </div>
            )}

            {totalPages > 1 && filteredImages.length > 0 && (
              <div className="flex justify-center items-center gap-4 h-16 shrink-0 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 bg-black/50 dark:bg-white/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-white/20 transition-colors duration-150 ease-in-out disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 dark:focus:ring-offset-[var(--background-primary)]"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-disabled)]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-black/50 dark:bg-white/10 rounded-full text-white hover:bg-black/70 dark:hover:bg-white/20 transition-colors duration-150 ease-in-out disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 dark:focus:ring-offset-[var(--background-primary)]"
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
              className="absolute top-4 right-4 p-2 text-white hover:text-[var(--background-tertiary)] dark:hover:text-[var(--text-disabled)] transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 dark:focus:ring-offset-[var(--background-primary)]"
              aria-label="Close fullscreen view"
            >
              <X className="w-6 h-6" />
            </button>
            <Image
              src={`${filteredImages[modalIndex]?.url.replace(
                "/public",
                ""
              )}/public`}
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
              className="absolute left-4 p-2 text-white hover:text-[var(--background-tertiary)] dark:hover:text-[var(--text-disabled)] transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 dark:focus:ring-offset-[var(--background-primary)]"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 p-2 text-white hover:text-[var(--background-tertiary)] dark:hover:text-[var(--text-disabled)] transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 dark:focus:ring-offset-[var(--background-primary)]"
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
