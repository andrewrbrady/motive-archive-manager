"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  ImageIcon,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";

interface GalleryImageProps {
  image: any;
  index: number;
  onAddImage: (imageUrl: string, altText?: string, imageObject?: any) => void;
}

/**
 * GalleryImage - Optimized lazy-loaded image component for gallery
 * Performance optimization: Prevents unnecessary re-renders with React.memo
 * and adds intersection observer for lazy loading
 */
const GalleryImage = React.memo<GalleryImageProps>(function GalleryImage({
  image,
  index,
  onAddImage,
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // Intersection Observer for lazy loading
  const imgRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        { rootMargin: "50px" }
      );
      observer.observe(node);
      return () => observer.disconnect();
    }
    return undefined;
  }, []);

  const handleImageError = useCallback(() => {
    console.error("❌ Image failed to load:", {
      src: image.imageUrl,
      alt: image.alt,
      galleryName: image.galleryName,
      originalUrl: image.url,
    });
    setHasError(true);
  }, [image]);

  const handleImageLoad = useCallback(() => {
    console.log("✅ Image loaded successfully:", {
      src: image.imageUrl,
      galleryName: image.galleryName,
    });
    setIsLoaded(true);
  }, [image]);

  const handleClick = useCallback(() => {
    onAddImage(image.imageUrl, image.alt, image);
  }, [image, onAddImage]);

  return (
    <div
      ref={imgRef}
      className="relative group cursor-pointer rounded-lg overflow-hidden border border-border/40 hover:border-border/60 transition-all"
      onClick={handleClick}
      title={`${image.alt} - ${image.galleryName}`}
    >
      {/* Lazy loading placeholder */}
      {!isInView ? (
        <div className="w-full aspect-[4/3] bg-muted/10 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
        </div>
      ) : (
        <>
          {hasError ? (
            <div className="w-full aspect-[4/3] bg-muted/20 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                Failed to load
              </span>
            </div>
          ) : (
            <img
              src={image.imageUrl}
              alt={image.alt || "Gallery image"}
              className={`w-full aspect-[4/3] object-cover group-hover:scale-105 transition-all bg-muted/10 ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
              onError={handleImageError}
              onLoad={handleImageLoad}
              loading="lazy"
            />
          )}

          {!isLoaded && !hasError && (
            <div className="absolute inset-0 bg-muted/10 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
            <Plus className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Gallery name badge */}
          <div className="absolute bottom-1 left-1 right-1">
            <div className="bg-black/70 text-white text-xs px-2 py-1 rounded text-center truncate">
              {image.galleryName}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

interface ImageGalleryProps {
  finalImages: any[];
  loadingImages: boolean;
  projectId?: string;
  activeBlockId: string | null;
  isGalleryCollapsed: boolean;
  onToggleCollapse: () => void;
  onRefreshImages: () => void;
  onAddImage: (imageUrl: string, altText?: string, imageObject?: any) => void;
}

/**
 * ImageGallery - Component for displaying and managing image galleries
 * Extracted from BlockComposer for better maintainability and performance
 * Maintains all existing functionality including lazy loading and intersection observer
 */
export const ImageGallery = React.memo<ImageGalleryProps>(
  function ImageGallery({
    finalImages,
    loadingImages,
    projectId,
    activeBlockId,
    isGalleryCollapsed,
    onToggleCollapse,
    onRefreshImages,
    onAddImage,
  }) {
    return (
      <Card className="bg-transparent border border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>Available Images</span>
              {finalImages.length > 0 && (
                <Badge variant="outline" className="bg-transparent text-xs">
                  {finalImages.length} images
                </Badge>
              )}
              {activeBlockId && (
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800 text-xs"
                >
                  Insert above active block
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefreshImages}
                disabled={loadingImages}
                className="hover:bg-muted/20"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loadingImages ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="hover:bg-muted/20"
              >
                {isGalleryCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        {!isGalleryCollapsed && (
          <CardContent>
            {loadingImages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading images...</span>
              </div>
            ) : finalImages && finalImages.length > 0 ? (
              <ScrollArea className="h-96">
                <div className="grid grid-cols-3 gap-2">
                  {finalImages.map((image: any, index: number) => (
                    <GalleryImage
                      key={`gallery-image-${image.id || "no-id"}-${index}`}
                      image={image}
                      index={index}
                      onAddImage={onAddImage}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>
                  No images found in{" "}
                  {projectId ? "project galleries" : "car gallery"}
                </p>
                {projectId && (
                  <p className="text-xs mt-1">
                    Make sure galleries are linked to this project
                  </p>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  }
);
