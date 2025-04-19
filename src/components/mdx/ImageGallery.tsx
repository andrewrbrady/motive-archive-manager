"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Images } from "lucide-react";

interface ImageGalleryProps {
  images: {
    id: string;
    src: string;
    alt?: string;
  }[];
  gridConfig?: {
    sm?: number;
    md?: number;
    lg?: number;
  };
  maxRows?: number;
  className?: string;
}

const getGridCols = (config: { sm?: number; md?: number; lg?: number }) => {
  const { sm = 1, md = 2, lg = 3 } = config;
  return `grid-cols-${sm} md:grid-cols-${md} lg:grid-cols-${lg}`;
};

export default function ImageGallery({
  images,
  gridConfig = { sm: 1, md: 2, lg: 3 },
  maxRows = 2,
  className,
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (imageId: string) => {
    setLoadErrors((prev) => ({ ...prev, [imageId]: true }));
  };

  // Calculate visible images based on grid config and maxRows
  const visibleImages = maxRows
    ? images.slice(0, maxRows * (gridConfig.lg || 3))
    : images;

  return (
    <div className={cn("space-y-4", className)}>
      <div className={cn("grid gap-4", getGridCols(gridConfig))}>
        {visibleImages.map((image) => (
          <div
            key={image.id}
            className="relative aspect-[4/3] overflow-hidden rounded-lg"
          >
            {!loadErrors[image.id] ? (
              <img
                src={image.src}
                alt={image.alt || ""}
                className="absolute inset-0 w-full h-full object-cover transition-transform hover:scale-105"
                onError={() => handleImageError(image.id)}
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <Images className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Image not available
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-xl p-2"
            onClick={() => setSelectedImage(null)}
          >
            ✕
          </button>
          <div className="relative w-full max-w-6xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Enlarged view"
              className="object-contain w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
