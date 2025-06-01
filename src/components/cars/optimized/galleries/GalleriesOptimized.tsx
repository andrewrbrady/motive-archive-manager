"use client";

import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "sonner";
import { BaseGalleries } from "./BaseGalleries";
import { GalleriesSkeleton } from "./GalleriesSkeleton";
import { Gallery, GalleriesProps } from "./index";

// Lazy load heavy components
const GalleriesEditor = lazy(() => import("./GalleriesEditor"));

export function GalleriesOptimized({ carId }: GalleriesProps) {
  const api = useAPI();

  // Core state
  const [attachedGalleries, setAttachedGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [showGalleriesEditor, setShowGalleriesEditor] = useState(false);

  // Performance tracking
  const [hasLoadedEditor, setHasLoadedEditor] = useState(false);

  // Simple loading guard
  if (!api) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <GalleriesOptimizedContent
      carId={carId}
      attachedGalleries={attachedGalleries}
      setAttachedGalleries={setAttachedGalleries}
      isLoading={isLoading}
      setIsLoading={setIsLoading}
      showGalleriesEditor={showGalleriesEditor}
      setShowGalleriesEditor={setShowGalleriesEditor}
      hasLoadedEditor={hasLoadedEditor}
      setHasLoadedEditor={setHasLoadedEditor}
    />
  );
}

interface GalleriesOptimizedContentProps {
  carId: string;
  attachedGalleries: Gallery[];
  setAttachedGalleries: React.Dispatch<React.SetStateAction<Gallery[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  showGalleriesEditor: boolean;
  setShowGalleriesEditor: React.Dispatch<React.SetStateAction<boolean>>;
  hasLoadedEditor: boolean;
  setHasLoadedEditor: React.Dispatch<React.SetStateAction<boolean>>;
}

function GalleriesOptimizedContent({
  carId,
  attachedGalleries,
  setAttachedGalleries,
  isLoading,
  setIsLoading,
  showGalleriesEditor,
  setShowGalleriesEditor,
  hasLoadedEditor,
  setHasLoadedEditor,
}: GalleriesOptimizedContentProps) {
  const api = useAPI();

  // Fetch attached galleries - critical path
  const fetchAttachedGalleries = useCallback(async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      console.time("GalleriesOptimized-fetchAttachedGalleries");

      const car = (await api.get(`cars/${carId}?includeGalleries=true`)) as {
        galleries?: Gallery[];
      };

      console.log(
        "[GalleriesOptimized] Car galleries from API:",
        car.galleries
      );
      setAttachedGalleries(car.galleries || []);
    } catch (error) {
      console.error(
        "[GalleriesOptimized] Error fetching attached galleries:",
        error
      );
      toast.error("Failed to fetch attached galleries");
      setAttachedGalleries([]);
    } finally {
      setIsLoading(false);
      console.timeEnd("GalleriesOptimized-fetchAttachedGalleries");
    }
  }, [carId, api, setAttachedGalleries, setIsLoading]);

  // Handle opening gallery management dialog
  const handleManageGalleries = useCallback(() => {
    setShowGalleriesEditor(true);
    if (!hasLoadedEditor) {
      setHasLoadedEditor(true);
    }
  }, [hasLoadedEditor, setHasLoadedEditor, setShowGalleriesEditor]);

  // Handle gallery editor updates
  const handleGalleriesUpdated = useCallback(() => {
    // Refresh attached galleries after editor operations
    fetchAttachedGalleries();
  }, [fetchAttachedGalleries]);

  // Initial load effect - critical path only
  useEffect(() => {
    if (!carId || !api) return;
    fetchAttachedGalleries();
  }, [carId, api, fetchAttachedGalleries]);

  console.log("GalleriesOptimizedContent: Rendering decision", {
    showGalleriesEditor,
    hasLoadedEditor,
    carId,
    attachedGalleriesCount: attachedGalleries.length,
  });

  return (
    <div className="space-y-4">
      {/* Always show BaseGalleries for critical path */}
      <BaseGalleries carId={carId} onManageGalleries={handleManageGalleries} />

      {/* Lazy load GalleriesEditor only when needed */}
      {showGalleriesEditor && hasLoadedEditor && (
        <Suspense fallback={<GalleriesSkeleton variant="management" />}>
          <GalleriesEditor
            carId={carId}
            open={showGalleriesEditor}
            onOpenChange={setShowGalleriesEditor}
            attachedGalleries={attachedGalleries}
            onGalleriesUpdated={handleGalleriesUpdated}
          />
        </Suspense>
      )}
    </div>
  );
}

export default GalleriesOptimized;
