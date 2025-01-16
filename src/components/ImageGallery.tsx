"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Loader2,
  Check,
  Edit,
  Compass,
  Eye,
  Sun,
  Move,
} from "lucide-react";
import Image from "next/image";
import {
  getCloudflareImageMetadata,
  extractImageIdFromUrl,
} from "@/lib/cloudflare";
import { ImageMetadataEditor } from "./ImageMetadataEditor";
import { cn } from "@/lib/utils";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
}

interface ImageGalleryProps {
  images: string[];
  title?: string;
  aspectRatio?: string;
  thumbnailsPerRow?: number;
  rowsPerPage?: number;
  isEditMode?: boolean;
  onRemoveImage?: (indices: number[]) => void;
  onImagesChange?: (files: FileList) => Promise<void>;
  uploading?: boolean;
  uploadProgress: UploadProgress[];
}

const MetadataSection = ({
  metadata,
  currentIndex,
}: {
  metadata: Record<string, any>[];
  currentIndex: number;
}) => {
  if (!metadata.length || !metadata[currentIndex]) return null;

  const currentMetadata = metadata[currentIndex];

  return (
    <div className="bg-white rounded-lg shadow p-3">
      <div className="grid grid-cols-4 divide-x divide-gray-200">
        {currentMetadata.angle && (
          <div className="flex items-center px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500 uppercase text-xs font-medium">
                Angle
              </span>
            </div>
            <span className="uppercase text-xs ml-auto">
              {currentMetadata.angle}
            </span>
          </div>
        )}
        {currentMetadata.view && (
          <div className="flex items-center px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500 uppercase text-xs font-medium">
                View
              </span>
            </div>
            <span className="uppercase text-xs ml-auto">
              {currentMetadata.view}
            </span>
          </div>
        )}
        {currentMetadata.tod && (
          <div className="flex items-center px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500 uppercase text-xs font-medium">
                Time of Day
              </span>
            </div>
            <span className="uppercase text-xs ml-auto">
              {currentMetadata.tod}
            </span>
          </div>
        )}
        {currentMetadata.movement && (
          <div className="flex items-center px-4 first:pl-0 last:pr-0">
            <div className="flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500 uppercase text-xs font-medium">
                Movement
              </span>
            </div>
            <span className="uppercase text-xs ml-auto">
              {currentMetadata.movement}
            </span>
          </div>
        )}
      </div>
      {currentMetadata.description && (
        <div className="mt-2 text-gray-600 border-t pt-2">
          {currentMetadata.description}
        </div>
      )}
    </div>
  );
};

const ImageSkeleton = ({ aspectRatio = "4/3" }: { aspectRatio?: string }) => (
  <div
    className="animate-pulse bg-gray-200 rounded-lg relative w-full"
    style={{ aspectRatio }}
  />
);

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
  uploadProgress = [],
}) => {
  const [mainIndex, setMainIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMainVisible, setIsMainVisible] = useState(true);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cloudflareMetadata, setCloudflareMetadata] = useState<
    Record<string, any>[]
  >([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(
    null
  );
  const [loadedImages, setLoadedImages] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [mainImageLoaded, setMainImageLoaded] = useState(false);

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
        if (e.shiftKey) {
          handlePageChange(currentPage - 1);
        } else {
          handlePrev();
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (e.shiftKey) {
          handlePageChange(currentPage + 1);
        } else {
          handleNext();
        }
      } else if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, isModalOpen, currentPage]);

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
      // Update mainIndex to first image of new page
      const firstImageIndex = (newPage - 1) * itemsPerPage;
      if (firstImageIndex < images.length) {
        setMainIndex(firstImageIndex);
      }
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && onImagesChange) {
      await onImagesChange(event.target.files);
    }
  };

  const getOverallProgress = () => {
    if (uploadProgress.length === 0) return 0;
    const total = uploadProgress.reduce((sum, file) => sum + file.progress, 0);
    return Math.round(total / uploadProgress.length);
  };

  const UploadProgressOverlay = () => {
    if (!uploading || uploadProgress.length === 0) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Uploading Images</h3>
              <span className="text-sm text-gray-500">
                {getOverallProgress()}% Complete
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${getOverallProgress()}%` }}
              />
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {uploadProgress.map((file, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[200px]">
                      {file.fileName}
                    </span>
                    <span className="text-gray-500">{file.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        file.status === "error"
                          ? "bg-red-500"
                          : file.status === "complete"
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                  {file.error && (
                    <p className="text-xs text-red-500">{file.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const paginatedImages = images.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleImageSelect = (index: number, event: React.MouseEvent) => {
    if (!isEditMode) return;
    event.preventDefault();
    event.stopPropagation();

    setSelectedImages((prev) => {
      const isSelected = prev.includes(index);
      if (isSelected) {
        return prev.filter((i) => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleDeleteSelected = () => {
    if (onRemoveImage && selectedImages.length > 0) {
      onRemoveImage(selectedImages);
      setSelectedImages([]);
    }
  };

  const handleSelectAll = () => {
    if (selectedImages.length === images.length) {
      // If all are selected, deselect all
      setSelectedImages([]);
    } else {
      // Select all images
      setSelectedImages(images.map((_, index) => index));
    }
  };

  // Fetch Cloudflare metadata for images
  useEffect(() => {
    const fetchMetadata = async () => {
      setIsLoadingMetadata(true);
      try {
        const metadataPromises = images.map(async (imageUrl) => {
          const imageId = extractImageIdFromUrl(imageUrl);
          if (!imageId) return null;
          return getCloudflareImageMetadata(imageId);
        });

        const results = await Promise.all(metadataPromises);
        setCloudflareMetadata(
          results.filter((meta): meta is Record<string, any> => meta !== null)
        );
      } catch (error) {
        console.error("Error fetching image metadata:", error);
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    if (images.length > 0) {
      fetchMetadata();
    }
  }, [images]);

  // Function to handle image load
  const handleImageLoad = (imageUrl: string) => {
    setLoadedImages((prev) => ({
      ...prev,
      [imageUrl]: true,
    }));
  };

  if (!images || images.length === 0) {
    return (
      <div className="space-y-4">
        <UploadProgressOverlay />
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
      <UploadProgressOverlay />

      <div className="flex gap-6">
        <div className="w-2/3 space-y-3">
          <div
            ref={mainImageRef}
            className={`sticky top-4 transition-opacity duration-300 ${
              isMainVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className={`relative aspect-[${aspectRatio}] w-full overflow-hidden rounded-lg bg-gray-100`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {!mainImageLoaded && <ImageSkeleton aspectRatio={aspectRatio} />}
              <img
                src={images[mainIndex]}
                alt={
                  title
                    ? `${title} - View ${mainIndex + 1}`
                    : `View ${mainIndex + 1} of ${images.length}`
                }
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  !mainImageLoaded && "opacity-0"
                )}
                onLoad={() => setMainImageLoaded(true)}
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-4 flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span className="text-sm font-medium">
                      Uploading images...
                    </span>
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

          <MetadataSection
            metadata={cloudflareMetadata}
            currentIndex={mainIndex}
          />
        </div>

        <div className="w-1/3 space-y-4">
          {isEditMode && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className={`px-3 py-1.5 border rounded-md hover:bg-gray-50 flex items-center gap-2 w-full ${
                    selectedImages.length === images.length
                      ? "border-blue-200 text-blue-600"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  {selectedImages.length === images.length ? (
                    <>
                      <Check className="w-4 h-4" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 9l7 7L20 5"
                        />
                      </svg>
                      Select All
                    </>
                  )}
                </button>
              </div>
              {selectedImages.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-2 w-full justify-center"
                >
                  <X className="w-4 h-4" />
                  Delete ({selectedImages.length})
                </button>
              )}
              <div className="flex gap-2">
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
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 w-full justify-center"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploading ? "Uploading..." : "Add Images"}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {paginatedImages.map((image, index) => {
              const actualIndex = (currentPage - 1) * itemsPerPage + index;
              const isSelected = selectedImages.includes(actualIndex);
              const imageId = extractImageIdFromUrl(image);
              const isLoaded = loadedImages[image];

              return (
                <div
                  key={index}
                  className="relative group cursor-pointer"
                  onClick={() => {
                    if (!isEditMode) {
                      setMainIndex(actualIndex);
                      setMainImageLoaded(!!loadedImages[images[actualIndex]]);
                    }
                  }}
                  style={{ aspectRatio }}
                >
                  {!isLoaded && <ImageSkeleton aspectRatio={aspectRatio} />}
                  <Image
                    src={image}
                    alt={`Image ${actualIndex + 1}`}
                    fill
                    className={cn(
                      "object-cover transition-all duration-300",
                      !isLoaded && "opacity-0",
                      isMainVisible && actualIndex === mainIndex
                        ? ""
                        : "opacity-75",
                      isSelected ? "opacity-75" : ""
                    )}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    onLoadingComplete={() => handleImageLoad(image)}
                  />
                  {isEditMode && (
                    <div
                      className="absolute top-2 right-2 z-10"
                      onClick={(e) => handleImageSelect(actualIndex, e)}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 ${
                          isSelected
                            ? "bg-blue-500 border-blue-500"
                            : "border-white"
                        } flex items-center justify-center`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  )}
                  {isEditMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingImageIndex(actualIndex);
                      }}
                      className="absolute bottom-2 right-2 p-1 bg-black/50 rounded text-white hover:bg-black/70"
                    >
                      <Edit className="w-4 h-4" />
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
                {currentPage}/{totalPages}
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

export default ImageGallery;
