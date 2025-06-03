"use client";

import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { toast } from "sonner";
import { useAPI } from "@/hooks/useAPI";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import {
  BaseSpecifications,
  BaseSpecificationsConfig,
  BaseSpecificationsCallbacks,
  CarData,
} from "./BaseSpecifications";
import { SpecificationsSkeleton } from "./SpecificationsSkeleton";

// Lazy load the editor for better performance
const SpecificationsEditor = lazy(() =>
  import("./SpecificationsEditor").then((m) => ({
    default: m.SpecificationsEditor,
  }))
);

// Lazy load enrichment component
const SpecificationsEnrichment = lazy(() =>
  import("../SpecificationsEnrichment").then((m) => ({
    default: m.SpecificationsEnrichment,
  }))
);

interface SpecificationsOptimizedProps {
  carId: string;
  vehicleInfo?: CarData; // Complete car data from parent
  isEditMode?: boolean;
  onEdit?: () => void;
  onSave?: (editedSpecs: Partial<CarData>) => void;
  onCancel?: () => void;
  onRefresh?: () => void;
}

/**
 * SpecificationsOptimized - Phase 2 optimized specifications component
 * Converted from blocking onDataFetch pattern to non-blocking useAPIQuery pattern
 * Following successful Phase 1 and 2 optimization patterns
 */
export function SpecificationsOptimized({
  carId,
  vehicleInfo,
  isEditMode = false,
  onEdit,
  onSave,
  onCancel,
  onRefresh,
}: SpecificationsOptimizedProps) {
  const api = useAPI();
  const [editMode, setEditMode] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  // Phase 2 optimization: Use non-blocking useAPIQuery instead of blocking onDataFetch
  const {
    data: carData,
    isLoading,
    error: apiError,
    refetch: refetchCarData,
  } = useAPIQuery<CarData>(`cars/${carId}`, {
    enabled: !vehicleInfo, // Only fetch if vehicleInfo is not provided
    staleTime: 3 * 60 * 1000, // 3 minutes cache for car data
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Use vehicleInfo if provided, otherwise use fetched carData
  const currentCarData = vehicleInfo || carData;

  // Update edit mode when prop changes
  useEffect(() => {
    setEditMode(isEditMode);
  }, [isEditMode]);

  // Handle API errors
  if (apiError) {
    console.error("Error fetching car specifications:", apiError);
  }

  if (!api) {
    return <SpecificationsSkeleton />;
  }

  const config: BaseSpecificationsConfig = {
    carId,
    onEdit: () => {
      setEditMode(true);
      if (onEdit) onEdit();
    },
    onRefresh: () => {
      if (onRefresh) {
        onRefresh();
      }
      // Also refetch our local data if needed
      if (!vehicleInfo) {
        refetchCarData();
      }
    },
    showEnrichment: true,
  };

  // Phase 2 improvement: Non-blocking callbacks that don't make API calls
  const callbacks: BaseSpecificationsCallbacks = {
    onDataFetch: async () => {
      // Since we're using useAPIQuery, we already have the data
      // This callback should not make blocking API calls
      if (currentCarData) {
        return {
          basicSpecs: currentCarData,
          advancedSpecs: currentCarData, // All specs are now in the same object
          clientData: null,
        };
      }

      // Fallback: if no data available, throw error to show loading state
      throw new Error("Car data not available");
    },

    onEnrichment: async (carId: string) => {
      // This will be handled by the lazy-loaded enrichment component
      if (onRefresh) {
        onRefresh();
      }
    },
  };

  const handleSave = async (editedSpecs: Partial<CarData>) => {
    if (!api) {
      toast.error("Authentication not ready");
      return;
    }

    // Phase 3D FIX: Remove blocking await from background operations
    const saveOperation = () => {
      api
        .patch(`cars/${carId}`, editedSpecs)
        .then((updatedCar) => {
          setEditMode(false);

          if (onSave) {
            onSave(editedSpecs);
          }

          toast.success("Specifications saved successfully");
        })
        .catch((error) => {
          console.error("Error saving specifications:", error);
          toast.error("Failed to save specifications");
        });
    };

    // Execute save operation in background - truly non-blocking
    setTimeout(saveOperation, 0);

    // Immediate optimistic feedback
    setEditMode(false);
    toast.success("Saving specifications in background...");
  };

  const handleCancel = () => {
    setEditMode(false);
    if (onCancel) {
      onCancel();
    }
  };

  // Phase 2 improvement: Non-blocking loading state
  if (isLoading && !vehicleInfo) {
    return (
      <div className="space-y-4">
        <div className="bg-muted/30 border border-muted rounded-md p-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">
              Loading specifications...
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            You can switch tabs while this loads
          </p>
        </div>
        <SpecificationsSkeleton />
      </div>
    );
  }

  // Show error state if there's an API error and no current data
  if (apiError && !currentCarData) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/15 border border-destructive/20 rounded-md p-3">
          <p className="text-destructive text-sm">
            Failed to load specifications. Tab switching is still available.
          </p>
          <button
            onClick={() => refetchCarData()}
            className="text-xs underline text-destructive hover:no-underline mt-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {editMode && currentCarData ? (
        // Edit Mode: Lazy load the heavy editor component
        <Suspense fallback={<SpecificationsSkeleton />}>
          <SpecificationsEditor
            config={{
              carId,
              onSave: handleSave,
              onCancel: handleCancel,
            }}
            carData={currentCarData}
            isEditMode={editMode}
          />
        </Suspense>
      ) : (
        // View Mode: Show optimized base component with two-column layout
        <BaseSpecifications
          config={config}
          callbacks={callbacks}
          initialData={currentCarData || undefined}
        />
      )}

      {/* Lazy load enrichment component when needed */}
      {!editMode && (
        <Suspense fallback={null}>
          <div style={{ display: "none" }}>
            <SpecificationsEnrichment
              carId={carId}
              onEnrichComplete={config.onRefresh || (() => {})}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}
