"use client";

import React, { useState, useEffect } from "react";
import { ImageUploader } from "./ImageUploader";
import { Loader2, Trash2, ZoomIn } from "lucide-react";
import Image from "next/image";
import { CarImage } from "@/types/car";

interface ImageProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  imageUrl?: string;
  metadata?: CarImage["metadata"];
  error?: string;
}

interface ImageManagerProps {
  onSelect?: (imageUrl: string) => void;
  selectedImages?: string[];
  maxSelection?: number;
  showUploader?: boolean;
  className?: string;
  onImageProgress?: (progress: ImageProgress) => void;
}

export default function ImageManager({
  onSelect,
  selectedImages = [],
  maxSelection = 10,
  showUploader = false,
  className = "",
  onImageProgress,
}: ImageManagerProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<ImageProgress[]>([]);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch("/api/cloudflare/images");
      if (!response.ok) {
        throw new Error("Failed to fetch images");
      }
      const data = await response.json();
      setImages(data.images);
    } catch (error) {
      console.error("Error fetching images:", error);
      setError("Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (_uploadedUrls: string[]) => {
    // Clear upload progress when all uploads are complete
    setUploadProgress([]);
  };

  const handleImageProgress = (progress: ImageProgress) => {
    setUploadProgress((prev) => {
      const existing = prev.findIndex((p) => p.fileName === progress.fileName);
      if (existing !== -1) {
        const newProgress = [...prev];
        newProgress[existing] = progress;
        return newProgress;
      }
      return [...prev, progress];
    });

    // Forward the progress to the parent component
    onImageProgress?.(progress);

    // When an image is uploaded (analyzing or complete), add it to the list immediately
    if (
      progress.imageUrl &&
      (progress.status === "analyzing" || progress.status === "complete")
    ) {
      setImages((prev) => {
        if (prev.includes(progress.imageUrl!)) return prev;
        return [progress.imageUrl!, ...prev];
      });
    }
  };

  const handleImageDelete = async (imageUrl: string) => {
    try {
      // Extract image ID from URL
      const imageId = imageUrl.split("/").pop()?.split("?")[0];
      if (!imageId) return;

      const response = await fetch("/api/cloudflare/images", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      setImages((prev) => prev.filter((url) => url !== imageUrl));
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  const handleImageClick = (imageUrl: string) => {
    if (onSelect) {
      if (maxSelection === 1) {
        onSelect(imageUrl);
      } else {
        const isSelected = selectedImages.includes(imageUrl);
        if (isSelected) {
          onSelect(selectedImages.filter((url) => url !== imageUrl).join(","));
        } else if (selectedImages.length < maxSelection) {
          onSelect([...selectedImages, imageUrl].join(","));
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className={className}>
      {showUploader && (
        <div className="mb-8">
          <ImageUploader
            onUploadComplete={handleImageUpload}
            onImageProgress={handleImageProgress}
            maxSelection={maxSelection}
          />
          {uploadProgress.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadProgress.map((progress) => (
                <div
                  key={progress.fileName}
                  className="bg-gray-50 p-3 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {progress.fileName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {progress.status === "error"
                        ? "Error"
                        : `${progress.progress}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        progress.status === "error"
                          ? "bg-red-500"
                          : progress.status === "complete"
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  {progress.status === "error" && (
                    <p className="text-xs text-red-500">{progress.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {images.length > 0 ? (
        <div className="grid grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <div
              key={imageUrl}
              className={`relative aspect-square rounded-lg overflow-hidden group cursor-pointer border-2 ${
                selectedImages.includes(imageUrl)
                  ? "border-blue-500"
                  : "border-transparent"
              }`}
            >
              <Image
                src={`${imageUrl}/public`}
                alt={`Image ${index + 1}`}
                fill
                className="object-cover"
                onClick={() => handleImageClick(imageUrl)}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity" />
              <div className="absolute inset-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setModalImage(imageUrl)}
                  className="p-1.5 bg-white rounded-full text-gray-700 hover:text-blue-500"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleImageDelete(imageUrl)}
                  className="p-1.5 bg-white rounded-full text-gray-700 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showUploader && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No images available
          </div>
        )
      )}

      {modalImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-4xl w-full h-full">
            <Image
              src={`${modalImage}/public`}
              alt="Full size preview"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
