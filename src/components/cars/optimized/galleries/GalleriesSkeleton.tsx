"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface GalleriesSkeletonProps {
  variant?: "grid" | "list" | "gallery" | "management";
  itemCount?: number;
}

export function GalleriesSkeleton({
  variant = "grid",
  itemCount = 4,
}: GalleriesSkeletonProps) {
  const content = (() => {
    switch (variant) {
      case "list":
        return <ListSkeleton itemCount={itemCount} />;
      case "gallery":
        return <GalleryViewSkeleton />;
      case "management":
        return <ManagementDialogSkeleton />;
      case "grid":
      default:
        return <GridSkeleton itemCount={itemCount} />;
    }
  })();

  return (
    <div className="relative">
      {content}
      {/* Subtle loading animation overlay */}
      <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-background/20 to-transparent pointer-events-none animate-pulse" />
      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background/20 to-transparent pointer-events-none animate-pulse" />
    </div>
  );
}

// Grid layout for attached galleries display
function GridSkeleton({ itemCount = 4 }: { itemCount: number }) {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Gallery grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: itemCount }).map((_, i) => (
          <Card key={i} className="group">
            <CardContent className="p-6">
              {/* Image placeholder with aspect ratio */}
              <div className="relative aspect-[16/9] mb-4">
                <Skeleton className="h-full w-full rounded-md" />
                {/* Image count badge */}
                <div className="absolute top-2 right-2">
                  <Skeleton className="h-6 w-12 rounded-md" />
                </div>
              </div>

              {/* Content skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// List layout for gallery management
function ListSkeleton({ itemCount = 6 }: { itemCount: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: itemCount }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex gap-3">
              {/* Thumbnail skeleton */}
              <Skeleton className="w-16 h-16 rounded-md flex-shrink-0" />

              {/* Content skeleton */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex items-center gap-2 mt-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20 ml-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Gallery management dialog skeleton
function ManagementDialogSkeleton() {
  return (
    <div className="space-y-6 py-4">
      {/* Currently attached section */}
      <div>
        <Skeleton className="h-6 w-40 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ListSkeleton itemCount={2} />
        </div>
      </div>

      {/* Available to attach section */}
      <div>
        <Skeleton className="h-6 w-32 mb-3" />

        {/* Search skeleton */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Available galleries grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96">
          <ListSkeleton itemCount={4} />
        </div>
      </div>
    </div>
  );
}

// Individual gallery view skeleton
function GalleryViewSkeleton() {
  return (
    <div className="space-y-4">
      {/* Gallery header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Main gallery content */}
      <Card>
        <CardContent className="p-6">
          <Skeleton className="aspect-[16/9] w-full" />
        </CardContent>
      </Card>

      {/* Gallery metadata */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-32" />
      </div>
    </div>
  );
}

export default GalleriesSkeleton;
