"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit3, ExternalLink, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import LazyImage from "@/components/LazyImage";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { Gallery, GalleriesProps } from "./index";

interface BaseGalleriesProps extends GalleriesProps {
  onManageGalleries?: () => void;
}

/**
 * BaseGalleries - Critical path component for Galleries tab
 * Part of Phase 3E optimization - uses useAPIQuery for non-blocking data fetching
 * Heavy gallery management operations are delegated to GalleriesEditor (lazy loaded)
 *
 * PHASE 3E OPTIMIZATION: Uses useAPIQuery for non-blocking data fetching
 */
export function BaseGalleries({
  carId,
  onManageGalleries,
}: BaseGalleriesProps) {
  const router = useRouter();

  // Use optimized query hook - non-blocking, cached data fetching
  const {
    data: carData,
    isLoading,
    error,
    refetch: refreshGalleries,
  } = useAPIQuery<{ galleries?: Gallery[] }>(
    `cars/${carId}?includeGalleries=true`,
    {
      staleTime: 3 * 60 * 1000, // 3 minutes cache for critical data
      retry: 1, // ✅ Phase 2A: Reduce retry for better performance
      // This ensures the query is enabled and won't block tab switching
      refetchOnWindowFocus: false,
    }
  );

  // Memoize galleries array for performance
  const attachedGalleries = carData?.galleries || [];

  // Navigate to gallery page
  const navigateToGallery = useCallback(
    (galleryId: string) => {
      router.push(`/galleries/${galleryId}`);
    },
    [router]
  );

  // Handle card click (navigate to gallery but prevent if clicking buttons)
  const handleCardClick = useCallback(
    (e: React.MouseEvent, galleryId: string) => {
      // Don't navigate if clicking on buttons or interactive elements
      if ((e.target as HTMLElement).closest("button")) {
        return;
      }
      navigateToGallery(galleryId);
    },
    [navigateToGallery]
  );

  // Handle error state without blocking UI
  if (error) {
    console.error("Error fetching attached galleries:", error);
  }

  return (
    <div className="space-y-6">
      {/* Header with Manage Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Attached Galleries</h2>
          <p className="text-muted-foreground">
            {attachedGalleries.length}{" "}
            {attachedGalleries.length === 1 ? "gallery" : "galleries"} attached
            to this car
          </p>
        </div>

        <Button variant="outline" onClick={onManageGalleries}>
          <Edit3 className="h-4 w-4 mr-2" />
          Manage Galleries
        </Button>
      </div>

      {/* Error display - non-blocking */}
      {error && (
        <div className="bg-destructive/15 border border-destructive/20 rounded-md p-3">
          <p className="text-destructive text-sm">
            Failed to load attached galleries. Tab switching is still available.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshGalleries()}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Gallery list - non-blocking loading */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">
              Loading galleries...
            </p>
            <p className="text-xs text-muted-foreground text-center">
              You can switch tabs while this loads
            </p>
          </div>
        </div>
      ) : attachedGalleries.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No galleries attached to this car</p>
          <p className="text-sm">
            Click "Manage Galleries" to attach galleries
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {attachedGalleries.map((gallery, index) => (
            <div
              key={gallery._id}
              className="group relative bg-card rounded-lg border p-6 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={(e) => handleCardClick(e, gallery._id)}
            >
              <div className="relative aspect-[16/9] mb-4 overflow-hidden rounded-md bg-muted">
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border text-foreground shadow-sm">
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {gallery.imageIds.length}
                  </span>
                </div>

                {/* External link indicator */}
                <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/90 text-primary-foreground shadow-sm">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">View Gallery</span>
                  </div>
                </div>

                {gallery.thumbnailImage ? (
                  <LazyImage
                    src={gallery.thumbnailImage.url}
                    alt={gallery.name}
                    width={400}
                    height={225}
                    className="w-full h-full"
                    priority={index < 2}
                    objectFit="cover"
                    loadingVariant="none"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="text-muted-foreground">No images</div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight">
                  {gallery.name}
                </h3>
                {gallery.description && (
                  <p className="text-muted-foreground line-clamp-2">
                    {gallery.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {new Date(gallery.updatedAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BaseGalleries;
