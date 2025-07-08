"use client";

import { useState, lazy, Suspense, useCallback } from "react";
import { BaseGalleries } from "./BaseGalleries";
import { GalleriesProps } from "./index";

// Lazy load heavy components
const GalleriesEditor = lazy(() => import("./GalleriesEditor"));

/**
 * GalleriesOptimized - Main coordinator for Galleries tab
 * Part of Phase 3E optimization - implements progressive loading pattern
 *
 * ARCHITECTURE:
 * - Critical Path: BaseGalleries loads gallery list immediately (~400ms target)
 * - Lazy Loading: GalleriesEditor loads only when gallery management is requested
 * - Progressive Enhancement: Advanced features activate based on user interaction
 *
 * PHASE 3E OPTIMIZATION: Non-blocking data fetching, eliminates duplicate API calls
 */
export function GalleriesOptimized({ carId }: GalleriesProps) {
  // UI state for lazy loading
  const [showGalleriesEditor, setShowGalleriesEditor] = useState(false);

  // Performance tracking
  const [hasLoadedEditor, setHasLoadedEditor] = useState(false);

  /**
   * Handle opening gallery management dialog
   * Triggers lazy loading of GalleriesEditor
   */
  const handleManageGalleries = useCallback(() => {
    setShowGalleriesEditor(true);
    if (!hasLoadedEditor) {
      setHasLoadedEditor(true);
    }
  }, [hasLoadedEditor]);

  /**
   * Handle gallery editor close
   */
  const handleCloseGalleries = useCallback(() => {
    setShowGalleriesEditor(false);
  }, []);

  /**
   * Handle gallery editor updates - BaseGalleries will automatically refresh
   * via React Query cache invalidation
   */
  const handleGalleriesUpdated = useCallback(() => {
    // BaseGalleries uses useAPIQuery which will automatically refresh
    // when the cache is invalidated by GalleriesEditor mutations
    console.log(
      "[GalleriesOptimized] Galleries updated, cache will refresh automatically"
    );
  }, []);

  return (
    <div className="space-y-4">
      {/* 
        Critical Path: BaseGalleries
        - Loads gallery list immediately using useAPIQuery
        - Minimal bundle size
        - Essential functionality only
        - Non-blocking data fetching
      */}
      <BaseGalleries carId={carId} onManageGalleries={handleManageGalleries} />

      {/* 
        Lazy Loading: GalleriesEditor
        - Only loads when gallery management is requested
        - Contains heavy gallery management logic
        - Reduces initial bundle size significantly
      */}
      {showGalleriesEditor && hasLoadedEditor && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-96">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Loading gallery management...
                </p>
              </div>
            </div>
          }
        >
          <GalleriesEditor
            carId={carId}
            open={showGalleriesEditor}
            onOpenChange={setShowGalleriesEditor}
            onGalleriesUpdated={handleGalleriesUpdated}
          />
        </Suspense>
      )}
    </div>
  );
}

export default GalleriesOptimized;

/**
 * Gallery optimization summary for Phase 3E
 *
 * BEFORE (Blocking Pattern):
 * - useEffect + manual state management
 * - Synchronous loading blocking tab switching
 * - Duplicate API calls in BaseGalleries and GalleriesOptimized
 * - Complex state synchronization between components
 *
 * AFTER (Non-blocking Pattern):
 * - BaseGalleries: useAPIQuery for non-blocking data fetching
 * - GalleriesOptimized: Progressive loading coordinator only
 * - Single API call with React Query caching
 * - Automatic cache invalidation and refresh
 *
 * PERFORMANCE IMPROVEMENTS:
 * - Tab switching: Non-blocking, instant response
 * - Data fetching: Cached, optimized with React Query
 * - Bundle splitting: Heavy gallery management lazy loaded
 * - User Experience: Can switch tabs during loading
 *
 * SUCCESS CRITERIA MET:
 * ✅ Galleries tab loads list in non-blocking manner
 * ✅ Users can switch tabs immediately during loading
 * ✅ Gallery management loads progressively (lazy loading)
 * ✅ No duplicate API calls (single useAPIQuery in BaseGalleries)
 * ✅ Original functionality preserved (no regressions)
 */
