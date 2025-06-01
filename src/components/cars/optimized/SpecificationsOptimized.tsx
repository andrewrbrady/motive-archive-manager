"use client";

import React, { useState, useEffect, Suspense, lazy } from "react";
import { toast } from "sonner";
import { useAPI } from "@/hooks/useAPI";
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
  const [currentCarData, setCurrentCarData] = useState<CarData | null>(
    vehicleInfo || null
  );
  const [editMode, setEditMode] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  // Update car data when vehicleInfo prop changes
  useEffect(() => {
    if (vehicleInfo) {
      setCurrentCarData(vehicleInfo);
    }
  }, [vehicleInfo]);

  // Update edit mode when prop changes
  useEffect(() => {
    setEditMode(isEditMode);
  }, [isEditMode]);

  if (!api) {
    return <SpecificationsSkeleton />;
  }

  const config: BaseSpecificationsConfig = {
    carId,
    onEdit: () => {
      setEditMode(true);
      if (onEdit) onEdit();
    },
    onRefresh,
    showEnrichment: true,
  };

  const callbacks: BaseSpecificationsCallbacks = {
    onDataFetch: async () => {
      try {
        // Use vehicleInfo if available to avoid redundant API call
        if (vehicleInfo) {
          return {
            basicSpecs: vehicleInfo,
            advancedSpecs: vehicleInfo, // All specs are now in the same object
            clientData: null,
          };
        }

        // If no vehicleInfo, fetch car data directly
        const carData = (await api.get(`cars/${carId}`)) as CarData;
        setCurrentCarData(carData);

        return {
          basicSpecs: carData,
          advancedSpecs: carData, // All specs are in the same object
          clientData: null,
        };
      } catch (err) {
        console.error("Error fetching specifications data:", err);
        throw err;
      }
    },

    onEnrichment: async (carId: string) => {
      // This will be handled by the lazy-loaded enrichment component
      if (onRefresh) {
        onRefresh();
      }
    },
  };

  const handleSave = async (editedSpecs: Partial<CarData>) => {
    try {
      if (!api) {
        toast.error("Authentication not ready");
        return;
      }

      const updatedCar = (await api.patch(
        `cars/${carId}`,
        editedSpecs
      )) as CarData;
      setCurrentCarData(updatedCar);
      setEditMode(false);

      if (onSave) {
        onSave(editedSpecs);
      }

      toast.success("Specifications saved successfully");
    } catch (error) {
      console.error("Error saving specifications:", error);
      toast.error("Failed to save specifications");
      throw error;
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    if (onCancel) {
      onCancel();
    }
  };

  // Show error state if there's an error and no current data
  if (error && !currentCarData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
              onEnrichComplete={onRefresh || (() => {})}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}
