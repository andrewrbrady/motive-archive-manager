import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  const [imgSrc, setImgSrc] = useState(src || placeholderSrc || "");
  const [error, setError] = useState(false);

  useEffect(() => {
    setImgSrc(src || placeholderSrc || "");
    setLoading(true);
    setError(false);
  }, [src, placeholderSrc]);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
    // Use a default placeholder for errors
    setImgSrc("/images/placeholder.jpg");
  };

  const renderImage = () => (
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
        "transition-opacity duration-300",
        loading ? "opacity-0" : "opacity-100",
        className
      )}
      style={{ objectFit }}
      onClick={onClick}
    />
  );

  const renderSkeleton = () => (
    <Skeleton
      className={cn(
        "rounded-md transition-opacity duration-300",
        loading ? "opacity-100" : "opacity-0",
        className
      )}
      style={{ width, height }}
    />
  );

  return (
    <div className={cn("relative", className)} style={{ width, height }}>
      {loadingVariant === "skeleton" && loading && renderSkeleton()}
      {renderImage()}
    </div>
  );
};

export default LazyImage;
