import Image, { ImageProps } from "next/image";
import {
  CLOUDFLARE_VARIANTS,
  isCloudflareImageUrl,
  cloudflareImageLoader,
} from "@/lib/cloudflare-image-loader";
import { getFormattedImageUrl } from "@/lib/cloudflare";
import { cn } from "@/lib/utils";
import { useState, useCallback, useRef, useEffect } from "react";

interface CloudflareImageProps extends Omit<ImageProps, "src" | "loader"> {
  src: string;
  variant?: keyof typeof CLOUDFLARE_VARIANTS;
  fallback?: string;
  showError?: boolean;
  progressive?: boolean; // Enable progressive loading with blur placeholder
  retryAttempts?: number; // Number of retry attempts for failed loads
  cacheKey?: string; // Optional cache key for localStorage caching
}

export function CloudflareImage({
  src,
  variant = "medium",
  fallback,
  alt,
  className,
  showError = true,
  progressive = false, // Disable by default to prevent issues
  retryAttempts = 1, // Reduce to prevent issues
  cacheKey,
  ...props
}: CloudflareImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Use the URL as-is since it's now a base URL, and let Next.js + custom loader handle sizing
  const optimizedSrc = src;

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.warn("Image load error:", src);
    setImageError(true);
    setIsLoading(false);

    if (fallback) {
      (e.target as HTMLImageElement).src = fallback;
    }

    props.onError?.(e);
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    setImageError(false);
    props.onLoad?.(e);
  };

  // Show error state if image failed to load and no fallback
  if (imageError && !fallback && showError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded-md border border-border",
          className
        )}
        style={{
          width: props.width,
          height: props.height,
          aspectRatio:
            props.width && props.height
              ? `${props.width}/${props.height}`
              : undefined,
        }}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs text-center">Failed to load image</span>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      className={cn(
        "transition-opacity duration-300",
        isLoading ? "opacity-0" : "opacity-100",
        className
      )}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
}

// Specialized components for common use cases
export function ThumbnailImage(props: Omit<CloudflareImageProps, "variant">) {
  return <CloudflareImage {...props} variant="thumbnail" />;
}

export function HeroImage(props: Omit<CloudflareImageProps, "variant">) {
  return <CloudflareImage {...props} variant="hero" />;
}

export function GalleryImage(props: Omit<CloudflareImageProps, "variant">) {
  return <CloudflareImage {...props} variant="gallery" />;
}

export function SquareImage(props: Omit<CloudflareImageProps, "variant">) {
  return <CloudflareImage {...props} variant="square" />;
}

export function WideImage(props: Omit<CloudflareImageProps, "variant">) {
  return <CloudflareImage {...props} variant="wide" />;
}

// Advanced component with responsive variants
interface ResponsiveCloudflareImageProps
  extends Omit<CloudflareImageProps, "variant"> {
  variants?: {
    mobile?: keyof typeof CLOUDFLARE_VARIANTS;
    tablet?: keyof typeof CLOUDFLARE_VARIANTS;
    desktop?: keyof typeof CLOUDFLARE_VARIANTS;
  };
}

export function ResponsiveCloudflareImage({
  variants = {
    mobile: "thumbnail",
    tablet: "medium",
    desktop: "large",
  },
  className,
  ...props
}: ResponsiveCloudflareImageProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Mobile */}
      <div className="block sm:hidden">
        <CloudflareImage {...props} variant={variants.mobile} />
      </div>

      {/* Tablet */}
      <div className="hidden sm:block lg:hidden">
        <CloudflareImage {...props} variant={variants.tablet} />
      </div>

      {/* Desktop */}
      <div className="hidden lg:block">
        <CloudflareImage {...props} variant={variants.desktop} />
      </div>
    </div>
  );
}
