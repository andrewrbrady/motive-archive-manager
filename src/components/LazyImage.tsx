import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  quality?: number;
  loadingVariant?: "skeleton" | "blur" | "none";
  placeholderSrc?: string;
  onClick?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width = 400,
  height = 300,
  className = "",
  priority = false,
  objectFit = "cover",
  quality = 90,
  loadingVariant = "skeleton",
  placeholderSrc,
  onClick,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState(src || placeholderSrc || "");

  useEffect(() => {
    setImgSrc(src || placeholderSrc || "");
    setLoading(true);
    setError(false);
  }, [src, placeholderSrc]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
    // Don't set a placeholder image URL here, render a fallback component instead
  };

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded-md",
          className
        )}
        style={{ width, height }}
        onClick={onClick}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="w-8 h-8" />
          <span className="text-xs">Failed to load image</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative", className)}
      style={{ width, height }}
      onClick={onClick}
    >
      {loadingVariant === "skeleton" && loading && (
        <Skeleton
          className={cn(
            "absolute inset-0 rounded-md",
            loading ? "opacity-100" : "opacity-0"
          )}
        />
      )}
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "rounded-md transition-opacity duration-300",
          loading ? "opacity-0" : "opacity-100",
          objectFit === "contain" ? "object-contain" : "object-cover"
        )}
      />
    </div>
  );
};

export default LazyImage;
