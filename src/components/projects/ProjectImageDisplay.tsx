import React, { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectImageDisplayProps {
  primaryImageUrl?: string | null;
  primaryImageId?: string | null;
  projectTitle: string;
  className?: string;
  aspectRatio?: string;
  showFallback?: boolean;
  sizes?: string;
}

/**
 * ProjectImageDisplay - Optimized component for displaying project cover images
 * Based on successful car image loading patterns with proper error handling
 *
 * Features:
 * - Graceful fallback for missing images
 * - Proper error handling for broken URLs
 * - Optimized loading with Next.js Image component
 * - Consistent styling with design system
 */
export function ProjectImageDisplay({
  primaryImageUrl,
  primaryImageId,
  projectTitle,
  className,
  aspectRatio = "aspect-[16/9]",
  showFallback = true,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
}: ProjectImageDisplayProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset error state when URL changes
  React.useEffect(() => {
    if (primaryImageUrl) {
      setImageError(false);
      setImageLoaded(false);
    }
  }, [primaryImageUrl]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn("Failed to load project image:", {
      primaryImageUrl,
      primaryImageId,
      projectTitle,
    });
    setImageError(true);

    // Hide the broken image element
    const img = e.target as HTMLImageElement;
    img.style.display = "none";
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Show fallback if no image URL or if there was an error
  const shouldShowFallback = !primaryImageUrl || imageError;

  return (
    <div className={cn("relative overflow-hidden", aspectRatio, className)}>
      {shouldShowFallback ? (
        // Fallback UI
        showFallback ? (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-12 w-12" />
              <span className="text-sm font-medium">No Cover Image</span>
            </div>
          </div>
        ) : null
      ) : (
        // Image display
        <>
          {/* Loading skeleton */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}

          <Image
            src={primaryImageUrl}
            alt={`${projectTitle} cover image`}
            fill
            className={cn(
              "object-cover transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            sizes={sizes}
            onError={handleImageError}
            onLoad={handleImageLoad}
            priority={false} // Usually not above the fold for project cards
          />
        </>
      )}
    </div>
  );
}

/**
 * ProjectImageThumbnail - Smaller variant for thumbnails and list views
 */
export function ProjectImageThumbnail({
  primaryImageUrl,
  primaryImageId,
  projectTitle,
  className,
}: Omit<ProjectImageDisplayProps, "aspectRatio" | "sizes">) {
  return (
    <ProjectImageDisplay
      primaryImageUrl={primaryImageUrl}
      primaryImageId={primaryImageId}
      projectTitle={projectTitle}
      className={className}
      aspectRatio="aspect-square"
      sizes="(max-width: 768px) 25vw, 15vw"
    />
  );
}

/**
 * ProjectImageHero - Larger variant for hero sections
 */
export function ProjectImageHero({
  primaryImageUrl,
  primaryImageId,
  projectTitle,
  className,
}: Omit<ProjectImageDisplayProps, "aspectRatio" | "sizes">) {
  return (
    <ProjectImageDisplay
      primaryImageUrl={primaryImageUrl}
      primaryImageId={primaryImageId}
      projectTitle={projectTitle}
      className={className}
      aspectRatio="aspect-[21/9]"
      sizes="100vw"
    />
  );
}
