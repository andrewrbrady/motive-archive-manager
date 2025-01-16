"use client";

import React, { useState, useEffect } from "react";
import { ImageUploader } from "./ImageUploader";
import { Loader2, Trash2, ZoomIn } from "lucide-react";
import Image from "next/image";

interface ImageManagerProps {
  onSelect?: (imageUrl: string) => void;
  selectedImages?: string[];
  maxSelection?: number;
  showUploader?: boolean;
  className?: string;
}

export const ImageManager: React.FC<ImageManagerProps> = ({
  onSelect,
  selectedImages = [],
  maxSelection = 1,
  showUploader = true,
  className = "",
}) => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);

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

  const handleImageUpload = async (uploadedUrls: string[]) => {
    setImages((prev) => [...uploadedUrls, ...prev]);
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
          <ImageUploader onUploadComplete={handleImageUpload} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {images.map((imageUrl, index) => (
          <div
            key={index}
            className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
          >
            <Image
              src={imageUrl}
              alt={`Uploaded image ${index + 1}`}
              fill
              className={`object-cover transition-transform group-hover:scale-105 ${
                selectedImages.includes(imageUrl) ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => handleImageClick(imageUrl)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setModalImage(imageUrl)}
                className="p-2 bg-white/90 rounded-full hover:bg-white"
                aria-label="View full size"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleImageDelete(imageUrl)}
                className="p-2 bg-white/90 rounded-full hover:bg-white text-red-500"
                aria-label="Delete image"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Image
              src={modalImage}
              alt="Full size preview"
              width={1200}
              height={800}
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageManager;
