"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, AlertCircle } from "lucide-react";
import { useProgressiveImage } from "@/lib/image/progressive-loader";
import { useImageWorker } from "@/lib/image/worker-client";

/**
 * Progressive Image Component - Phase 4 Performance Optimization
 *
 * Features:
 * 1. ✅ Progressive loading with intersection observer
 * 2. ✅ Web Worker integration for processing
 * 3. ✅ Smart placeholder strategies
 * 4. ✅ Automatic thumbnail generation
 * 5. ✅ Error handling and fallbacks
 * 6. ✅ Performance monitoring
 */

export interface ProgressiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: "blur" | "skeleton" | "none";
  preloadStrategy?: "none" | "viewport" | "hover" | "immediate";
  autoOptimize?: boolean;
  thumbnailSize?: { width: number; height: number };
  onLoad?: (element: HTMLImageElement) => void;
  onError?: (element: HTMLImageElement, error: Error) => void;
  onClick?: () => void;
  fallbackSrc?: string;
  showLoadingStats?: boolean;
}

export function ProgressiveImage({
  src,
  alt,
  width = 400,
  height = 300,
  className,
  containerClassName,
  priority = false,
  quality = 85,
  placeholder = "skeleton",
  preloadStrategy = "viewport",
  autoOptimize = false,
  thumbnailSize,
  onLoad,
  onError,
  onClick,
  fallbackSrc,
  showLoadingStats = false,
}: ProgressiveImageProps) {
  const [loadingState, setLoadingState] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [optimizedSrc, setOptimizedSrc] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const loadStartTime = useRef<number | null>(null);

  // Progressive loading hook
  const { imgRef, loaded, error } = useProgressiveImage(src, {
    threshold: 0.1,
    rootMargin: priority ? "0px" : "100px",
    quality,
    placeholder,
    preloadStrategy: priority ? "immediate" : preloadStrategy,
    retryAttempts: 3,
    onLoad: (element) => {
      if (loadStartTime.current) {
        const time = performance.now() - loadStartTime.current;
        setLoadTime(time);
      }
      setLoadingState("loaded");
      onLoad?.(element);
    },
    onError: (element, err) => {
      setLoadingState("error");
      setShowFallback(true);
      onError?.(element, err);
    },
  });

  // Image worker for optimization
  const { isAvailable: workerAvailable, generateThumbnail } = useImageWorker();

  // Auto-optimize image if requested and worker is available
  useEffect(() => {
    if (!autoOptimize || !workerAvailable || !src || optimizedSrc) return;

    const optimizeImage = async () => {
      try {
        // Fetch the original image
        const response = await fetch(src);
        const blob = await response.blob();

        // Generate optimized thumbnail if size is specified
        if (thumbnailSize) {
          const result = await generateThumbnail(blob, {
            width: thumbnailSize.width,
            height: thumbnailSize.height,
            quality: quality / 100,
          });

          if (result?.arrayBuffer) {
            const optimizedBlob = new Blob([result.arrayBuffer], {
              type: "image/jpeg",
            });
            const optimizedUrl = URL.createObjectURL(optimizedBlob);
            setOptimizedSrc(optimizedUrl);
          }
        }
      } catch (error) {
        console.warn("Failed to optimize image:", error);
      }
    };

    optimizeImage();

    // Cleanup optimized URL on unmount
    return () => {
      if (optimizedSrc) {
        URL.revokeObjectURL(optimizedSrc);
      }
    };
  }, [
    autoOptimize,
    workerAvailable,
    src,
    thumbnailSize,
    quality,
    generateThumbnail,
    optimizedSrc,
  ]);

  // Track loading state
  useEffect(() => {
    if (loaded) {
      setLoadingState("loaded");
    } else if (error) {
      setLoadingState("error");
    } else if (src) {
      setLoadingState("loading");
      loadStartTime.current = performance.now();
    }
  }, [loaded, error, src]);

  // Determine which source to use
  const imageSrc = optimizedSrc || src;

  // Container styles
  const containerStyle = {
    aspectRatio: `${width}/${height}`,
    width: "100%",
    height: "auto",
  };

  // Error state
  if (loadingState === "error" && !fallbackSrc) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded-md border border-border",
          containerClassName
        )}
        style={containerStyle}
        onClick={onClick}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
          <AlertCircle className="w-8 h-8" />
          <span className="text-xs text-center">Failed to load image</span>
          {showLoadingStats && loadTime && (
            <span className="text-xs text-muted-foreground">
              Load time: {loadTime.toFixed(0)}ms
            </span>
          )}
        </div>
      </div>
    );
  }

  // Fallback image
  if (showFallback && fallbackSrc) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-md",
          containerClassName
        )}
        style={containerStyle}
        onClick={onClick}
      >
        <img
          src={fallbackSrc}
          alt={alt}
          className={cn("w-full h-full object-cover", className)}
        />
        {showLoadingStats && (
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            Fallback
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden rounded-md", containerClassName)}
      style={containerStyle}
      onClick={onClick}
    >
      {/* Skeleton placeholder */}
      {placeholder === "skeleton" && loadingState === "loading" && (
        <Skeleton className="absolute inset-0" />
      )}

      {/* Blur placeholder */}
      {placeholder === "blur" && loadingState === "loading" && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          loadingState === "loaded" ? "opacity-100" : "opacity-0",
          className
        )}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />

      {/* Loading stats overlay (development only) */}
      {showLoadingStats && process.env.NODE_ENV === "development" && (
        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          <div>State: {loadingState}</div>
          {loadTime && <div>Load: {loadTime.toFixed(0)}ms</div>}
          {optimizedSrc && <div>Optimized: ✓</div>}
          {workerAvailable && <div>Worker: ✓</div>}
        </div>
      )}

      {/* Loading indicator */}
      {loadingState === "loading" && placeholder === "none" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Progressive Image Gallery Component
 */
export interface ProgressiveImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    id?: string;
  }>;
  columns?: number;
  gap?: number;
  thumbnailSize?: { width: number; height: number };
  onImageClick?: (image: any, index: number) => void;
  autoOptimize?: boolean;
  showLoadingStats?: boolean;
  className?: string;
}

export function ProgressiveImageGallery({
  images,
  columns = 4,
  gap = 4,
  thumbnailSize = { width: 300, height: 200 },
  onImageClick,
  autoOptimize = true,
  showLoadingStats = false,
  className,
}: ProgressiveImageGalleryProps) {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap * 0.25}rem`,
  };

  return (
    <div className={cn("w-full", className)} style={gridStyle}>
      {images.map((image, index) => (
        <ProgressiveImage
          key={image.id || index}
          src={image.src}
          alt={image.alt}
          width={thumbnailSize.width}
          height={thumbnailSize.height}
          autoOptimize={autoOptimize}
          thumbnailSize={thumbnailSize}
          showLoadingStats={showLoadingStats}
          priority={index < 4} // Prioritize first 4 images
          onClick={() => onImageClick?.(image, index)}
          className="cursor-pointer hover:opacity-90 transition-opacity"
        />
      ))}
    </div>
  );
}

/**
 * Progressive Image with Zoom
 */
export interface ProgressiveImageWithZoomProps extends ProgressiveImageProps {
  zoomSrc?: string;
  zoomQuality?: number;
}

export function ProgressiveImageWithZoom({
  zoomSrc,
  zoomQuality = 95,
  ...props
}: ProgressiveImageWithZoomProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);

  const handleClick = () => {
    if (zoomSrc && !isZoomed) {
      setZoomedImageSrc(zoomSrc);
      setIsZoomed(true);
    }
    props.onClick?.();
  };

  const handleCloseZoom = () => {
    setIsZoomed(false);
    setZoomedImageSrc(null);
  };

  return (
    <>
      <ProgressiveImage {...props} onClick={handleClick} />

      {/* Zoom overlay */}
      {isZoomed && zoomedImageSrc && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={handleCloseZoom}
        >
          <div className="relative max-w-full max-h-full">
            <ProgressiveImage
              src={zoomedImageSrc}
              alt={props.alt}
              quality={zoomQuality}
              priority
              placeholder="blur"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={handleCloseZoom}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
