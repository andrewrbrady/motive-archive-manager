"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
}

export const ImageGalleryEnhanced: React.FC<ImageGalleryProps> = ({
  images,
}) => {
  const [mainIndex, setMainIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const imagesPerRow = 8;
  const rowsPerPage = 3;
  const itemsPerPage = imagesPerRow * rowsPerPage;
  const totalPages = Math.ceil(images.length / itemsPerPage);

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
    const selectedImagePage = Math.ceil((mainIndex + 1) / itemsPerPage);
    if (selectedImagePage !== currentPage) {
      setCurrentPage(selectedImagePage);
    }
  }, [mainIndex, itemsPerPage, currentPage]);

  const handleNext = useCallback(() => {
    if (isModalOpen) {
      setModalIndex((prev) => (prev + 1) % images.length);
    } else {
      setMainIndex((prev) => (prev + 1) % images.length);
    }
  }, [isModalOpen, images.length]);

  const handlePrev = useCallback(() => {
    if (isModalOpen) {
      setModalIndex((prev) => (prev - 1 + images.length) % images.length);
    } else {
      setMainIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  }, [isModalOpen, images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, isModalOpen]);

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

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const paginatedImages = images.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const [isMainVisible, setIsMainVisible] = useState(true);

  return (
    <div className="space-y-4">
      <div
        ref={mainImageRef}
        className={`sticky top-4 mb-4 transition-opacity duration-300 ${
          isMainVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-100"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={images[mainIndex]}
            alt={`Vehicle view ${mainIndex + 1} of ${images.length}`}
            className="w-full h-full object-cover"
          />
          <button
            onClick={() => {
              setModalIndex(mainIndex);
              setIsModalOpen(true);
            }}
            className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
            aria-label="Open fullscreen view"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {paginatedImages.map((image, index) => {
            const actualIndex = (currentPage - 1) * itemsPerPage + index;
            return (
              <button
                key={actualIndex}
                onClick={() => setMainIndex(actualIndex)}
                className={`aspect-square relative transition-opacity duration-200 ${
                  actualIndex === mainIndex
                    ? "ring-2 ring-blue-500"
                    : "opacity-75 hover:opacity-100"
                }`}
                aria-label={`View image ${actualIndex + 1}`}
                aria-current={actualIndex === mainIndex ? "true" : "false"}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${actualIndex + 1}`}
                  className="w-full h-full object-cover rounded-md"
                />
              </button>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 disabled:opacity-50"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
        >
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 p-2 text-white"
            aria-label="Close fullscreen view"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={images[modalIndex]}
            alt={`Full size view ${modalIndex + 1} of ${images.length}`}
            className="max-w-full max-h-[90vh] object-contain"
          />
          <button
            onClick={handlePrev}
            className="absolute left-4 p-2 text-white"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 p-2 text-white"
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageGalleryEnhanced;
