import React from "react";
import Image, { ImageProps } from "next/image";
import {
  CLOUDFLARE_VARIANTS,
  isCloudflareImageUrl,
  cloudflareImageLoader,
} from "@/lib/cloudflare-image-loader";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { MotiveLogo } from "./MotiveLogo";
import { LoadingSpinner } from "./loading";

interface CloudflareImageProps extends Omit<ImageProps, "src" | "loader"> {
  src: string;
  variant?: keyof typeof CLOUDFLARE_VARIANTS;
  fallback?: string;
  showError?: boolean;
  progressive?: boolean; // Enable progressive loading with blur placeholder
  retryAttempts?: number; // Number of retry attempts for failed loads
  cacheKey?: string; // Optional cache key for localStorage caching
  isAboveFold?: boolean; // New: Indicates if image is above the fold for fetch priority
  useIntersectionLazyLoad?: boolean; // New: Use intersection observer for lazy loading
}

export function CloudflareImage({
  src,
  variant = "public",
  fallback,
  alt,
  className,
  showError = true,
  progressive = false, // Keep disabled by default for compatibility
  retryAttempts = 1, // Keep reduced to prevent issues
  cacheKey,
  isAboveFold = false, // New: Default to false
  useIntersectionLazyLoad = false, // New: Default to false for backward compatibility
  ...props
}: CloudflareImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInView, setIsInView] = useState(!useIntersectionLazyLoad); // Load immediately if not using intersection observer
  const imageRef = useRef<HTMLImageElement>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  // FIXED: Use flexible resizing instead of named variants to avoid 404s
  const optimizedSrc = useMemo(() => {
    if (src.includes("imagedelivery.net")) {
      // Extract base URL (account + image ID)
      const baseUrlMatch = src.match(
        /^(https:\/\/imagedelivery\.net\/[^\/]+\/[^\/]+)/
      );
      if (!baseUrlMatch) return src;

      const baseUrl = baseUrlMatch[1];

      // Use flexible resizing based on variant
      const getFlexibleParams = (variant: string) => {
        switch (variant) {
          case "thumbnail":
            return "w=200,h=150,fit=cover,q=85";
          case "medium":
            return "w=600,h=400,fit=cover,q=85";
          case "large":
            return "w=1200,h=800,fit=cover,q=85";
          case "hero":
            return "w=1920,q=90";
          default:
            return "public"; // Use original for fallback
        }
      };

      const params = getFlexibleParams(variant);
      return `${baseUrl}/${params}`;
    }
    return src;
  }, [src, variant]);

  // Phase 2B Task 1: Add cache optimization headers for Cloudflare URLs
  const getCacheOptimizedSrc = useCallback((src: string) => {
    // Cloudflare Images already have aggressive CDN caching built-in
    // Adding cache parameters via URL can break the image service
    // Return the URL as-is since Cloudflare handles caching automatically
    return src;
  }, []);

  // Phase 2B Task 1: Intersection Observer for lazy loading with fallback
  useEffect(() => {
    if (!useIntersectionLazyLoad || !imageRef.current) {
      return;
    }

    // Only create intersection observer if explicitly enabled
    try {
      // Create intersection observer for smart lazy loading
      intersectionObserverRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setIsInView(true);
            // Disconnect observer once image is in view
            if (intersectionObserverRef.current) {
              intersectionObserverRef.current.disconnect();
            }
          }
        },
        {
          // Start loading when image is 50px away from viewport
          rootMargin: "50px",
          threshold: 0.1,
        }
      );

      intersectionObserverRef.current.observe(imageRef.current);
    } catch (error) {
      console.warn(
        "Failed to create intersection observer, falling back to immediate load:",
        error
      );
      setIsInView(true); // Fallback to immediate loading
    }

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [useIntersectionLazyLoad]);

  // Cleanup intersection observer on unmount
  useEffect(() => {
    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, []);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    const isDevelopment = process.env.NODE_ENV === "development";

    // Phase 2: Simple development error handling - just try fallbacks without noise
    if (isDevelopment) {
      console.warn(`CloudflareImage: Image failed to load, trying fallback...`);
    }

    setImageError(true);
    setIsLoading(false);

    // Try fallback if available
    if (fallback && target.src !== fallback) {
      target.src = fallback;
      return;
    }

    // Phase 2: If Cloudflare URL failed, try /public variant as it's most reliable
    if (src.includes("imagedelivery.net")) {
      const baseUrl = src.split("/").slice(0, -1).join("/");
      const publicUrl = `${baseUrl}/public`;

      if (target.src !== publicUrl) {
        if (isDevelopment) {
          console.warn("CloudflareImage: Trying /public variant fallback");
        }
        target.src = publicUrl;
        return;
      }
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
            aria-label="Failed to load image icon"
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

  // Phase 2B Task 1: Show placeholder while waiting for intersection observer
  if (useIntersectionLazyLoad && !isInView) {
    return (
      <div
        ref={imageRef}
        className={cn(
          "flex items-center justify-center bg-muted/50 rounded-md animate-pulse",
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
        <svg
          className="w-8 h-8 text-muted-foreground/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-label="Loading image placeholder icon"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  // Phase 2B Task 1: Build optimized image props with fetch priority and loading strategy
  // Extract and filter out potentially conflicting props
  const {
    priority: oldPriority,
    loading: oldLoading,
    ...filteredProps
  } = props;

  // Phase 2: Enhanced image props with development environment detection
  const imageProps: ImageProps = {
    src: getCacheOptimizedSrc(optimizedSrc),
    className: cn(
      "transition-opacity duration-300",
      isLoading ? "opacity-0" : "opacity-100",
      className
    ),
    onError: handleError,
    onLoad: handleLoad,
    // Phase 2: Add fetchpriority for above-fold images
    fetchPriority: isAboveFold ? "high" : "auto",
    // Phase 2: Development-aware loading strategy
    ...(process.env.NODE_ENV === "development"
      ? {
          // In development, use unoptimized loading to avoid /_next/image issues
          unoptimized: src.includes("imagedelivery.net"),
          // Still respect priority for above-fold images
          ...(isAboveFold ? { priority: true } : { loading: "lazy" }),
        }
      : {
          // In production, use normal optimization
          ...(isAboveFold ? { priority: true } : { loading: "lazy" }),
        }),
    ...filteredProps, // Use filtered props to avoid conflicts
    // Ensure alt prop is always present and comes after filteredProps to override any conflicts
    alt: alt || "",
  };

  // Phase 2B Task 1: Handle intersection observer case separately due to ref typing
  if (useIntersectionLazyLoad) {
    return <Image {...imageProps} alt={alt || ""} ref={imageRef} />;
  }

  return <Image {...imageProps} alt={alt || ""} />;
}

// Specialized components for common use cases with Phase 2B optimizations
export function ThumbnailImage(props: Omit<CloudflareImageProps, "variant">) {
  return (
    <CloudflareImage
      {...props}
      variant="thumbnail"
      useIntersectionLazyLoad={true} // Phase 2B: Enable lazy loading for thumbnails
    />
  );
}

export function HeroImage(props: Omit<CloudflareImageProps, "variant">) {
  return (
    <CloudflareImage
      {...props}
      variant="hero"
      isAboveFold={true} // Phase 2B: Hero images are above fold, load with high priority
    />
  );
}

export function GalleryImage(props: Omit<CloudflareImageProps, "variant">) {
  return (
    <CloudflareImage
      {...props}
      variant="gallery"
      useIntersectionLazyLoad={true} // Phase 2B: Enable lazy loading for gallery images
    />
  );
}

export function SquareImage(props: Omit<CloudflareImageProps, "variant">) {
  return (
    <CloudflareImage
      {...props}
      variant="square"
      useIntersectionLazyLoad={true} // Phase 2B: Enable lazy loading for square images
    />
  );
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
