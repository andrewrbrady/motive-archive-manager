"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface CarTabSkeletonProps {
  variant?: "grid" | "list" | "gallery" | "form" | "full";
  itemCount?: number;
}

export function CarTabSkeleton({
  variant = "list",
  itemCount = 6,
}: CarTabSkeletonProps) {
  const content = (() => {
    switch (variant) {
      case "grid":
        return <GridSkeleton itemCount={itemCount} />;
      case "gallery":
        return <GallerySkeleton itemCount={itemCount} />;
      case "form":
        return <FormSkeleton />;
      case "full":
        return <FullPageSkeleton />;
      case "list":
      default:
        return <ListSkeleton itemCount={itemCount} />;
    }
  })();

  // Adjust gradient height based on variant
  const gradientHeight =
    variant === "form" ? "h-32" : variant === "gallery" ? "h-20" : "h-24";

  return (
    <div className="relative">
      {content}
      {/* Top subtle fade with animation */}
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background/30 to-transparent pointer-events-none animate-pulse" />
      {/* Bottom gradient fade overlay - adapts to variant with animation */}
      <div
        className={`absolute inset-x-0 bottom-0 ${gradientHeight} bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none animate-pulse`}
      />
    </div>
  );
}

// Grid layout for image galleries, attached galleries
function GridSkeleton({ itemCount = 6 }: { itemCount: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: itemCount }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-48 w-full mb-4" />
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// List layout for events, specifications
function ListSkeleton({ itemCount = 6 }: { itemCount: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: itemCount }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Gallery layout for image viewer
function GallerySkeleton({ itemCount = 1 }: { itemCount: number }) {
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Main Gallery Layout */}
      <div className="flex gap-6 h-[calc(100vh-350px)] min-h-[500px]">
        {/* Main Image Viewer */}
        <div className="flex-1 min-w-0 lg:w-2/3">
          <Card className="h-full">
            <CardContent className="p-6 h-full">
              <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Thumbnails */}
        <div className="w-full lg:w-1/3 lg:max-w-[400px] min-w-[280px]">
          <Card className="h-full">
            <CardContent className="p-4 h-full">
              <div className="space-y-3 h-full">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="grid grid-cols-3 gap-2 flex-1 content-start overflow-hidden">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[4/3] w-full" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Form layout for captions, copywriter
function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-200px)]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Car Selection */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>

          {/* System Prompt Selection */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>

          {/* Generation Controls */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-36" />
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-10 w-16" />
              </div>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="py-4 text-center">
        <div className="inline-flex items-center">
          <Skeleton className="h-4 w-4 rounded-full mr-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>
  );
}

// Full page skeleton
function FullPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ListSkeleton itemCount={4} />
        </div>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default CarTabSkeleton;
