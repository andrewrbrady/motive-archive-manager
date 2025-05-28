import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import { CLOUDFLARE_VARIANTS } from "@/lib/cloudflare-image-loader";

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
  // New Cloudflare-specific props (optional for backward compatibility)
  variant?: keyof typeof CLOUDFLARE_VARIANTS;
  fallback?: string;
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
  variant,
  fallback,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | undefined>(
    src || placeholderSrc
  );

  useEffect(() => {
    if (!src && !placeholderSrc) {
      setError(true);
      setLoading(false);
      return;
    }
    setImgSrc(src || placeholderSrc);
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
  };

  // Determine the appropriate variant based on dimensions if not specified
  const getAutoVariant = (): keyof typeof CLOUDFLARE_VARIANTS => {
    if (variant) return variant;

    // Auto-select variant based on dimensions
    if (width <= 200 || height <= 200) return "thumbnail";
    if (width >= 1200 || height >= 800) return "large";
    if (width === height) return "square";
    if (width > height * 1.5) return "wide";
    return "medium";
  };

  if (error || !imgSrc) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded-md",
          className
        )}
        style={{
          aspectRatio: `${width}/${height}`,
          width: "100%",
          height: "auto",
        }}
        onClick={onClick}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="w-8 h-8" />
          <span className="text-xs">Failed to load image</span>
        </div>
      </div>
    );
  }

  const containerStyle = {
    aspectRatio: `${width}/${height}`,
    width: "100%",
    height: "auto",
    position: "relative" as const,
  };

  return (
    <div
      className={cn("relative overflow-hidden rounded-md", className)}
      style={containerStyle}
      onClick={onClick}
    >
      {loadingVariant === "skeleton" && loading && (
        <Skeleton
          className={cn(
            "absolute inset-0",
            loading ? "opacity-100" : "opacity-0"
          )}
        />
      )}
      <CloudflareImage
        src={imgSrc}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        quality={quality}
        priority={priority}
        variant={getAutoVariant()}
        fallback={fallback || placeholderSrc}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "transition-opacity duration-300",
          loading ? "opacity-0" : "opacity-100",
          objectFit === "contain" ? "object-contain" : "object-cover"
        )}
        showError={false} // We handle error display ourselves for consistency
      />
    </div>
  );
};

export default LazyImage;
