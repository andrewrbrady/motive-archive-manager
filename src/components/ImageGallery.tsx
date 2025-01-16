"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, Loader2 } from "lucide-react";
import Image from "next/image";

interface ImageGalleryProps {
  images: string[];
  title?: string;
  aspectRatio?: string;
  thumbnailsPerRow?: number;
  rowsPerPage?: number;
  isEditMode?: boolean;
  onRemoveImage?: (index: number) => void;
  onImagesChange?: (files: FileList) => Promise<void>;
  uploading?: boolean;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  title,
  aspectRatio = "4/3",
  thumbnailsPerRow = 8,
  rowsPerPage = 3,
  isEditMode = false,
  onRemoveImage,
  onImagesChange,
  uploading = false,
}) => {
  const [mainIndex, setMainIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMainVisible, setIsMainVisible] = useState(true);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const itemsPerPage = thumbnailsPerRow * rowsPerPage;
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && onImagesChange) {
      onImagesChange(event.target.files);
    }
  };

  const paginatedImages = images.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!images || images.length === 0) {
    return (
      <div className="space-y-4">
        <div className="w-full aspect-[4/3] relative bg-gray-100 rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <div className="text-gray-400 text-center space-y-2">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm font-medium">No images available</p>
            </div>
          </div>
        </div>
        {isEditMode && (
          <div className="flex justify-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept="image/*"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {uploading && <Loader2 className="w-5 h-5 animate-spin" />}
              {uploading ? "Uploading..." : "Upload Vehicle Images"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        ref={mainImageRef}
        className={`sticky top-4 mb-4 transition-opacity duration-300 ${
          isMainVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`relative aspect-[${aspectRatio}] w-full overflow-hidden rounded-lg bg-gray-100`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={images[mainIndex]}
            alt={
              title
                ? `${title} - View ${mainIndex + 1}`
                : `View ${mainIndex + 1} of ${images.length}`
            }
            className="w-full h-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-4 flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-sm font-medium">Uploading images...</span>
              </div>
            </div>
          )}
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
        {isEditMode && (
          <div className="flex justify-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept="image/*"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploading ? "Uploading..." : "Add Images"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {paginatedImages.map((image, index) => {
            const actualIndex = (currentPage - 1) * itemsPerPage + index;
            return (
              <div key={actualIndex} className="relative group">
                <button
                  onClick={() => setMainIndex(actualIndex)}
                  className={`aspect-square relative w-full transition-opacity duration-200 ${
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
                {isEditMode && onRemoveImage && (
                  <button
                    onClick={() => onRemoveImage(actualIndex)}
                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove image ${actualIndex + 1}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
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
            className="absolute left-4 p-2 text-wh:w
            ite"
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

export default ImageGallery;
