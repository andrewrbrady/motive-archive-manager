"use client";

import React, { Suspense, lazy, useState, useEffect } from "react";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { LoadingSpinner } from "@/components/ui/loading";
import { toast } from "react-hot-toast";
import { useAPI } from "@/hooks/useAPI";
import { CarTabSkeleton } from "@/components/ui/CarTabSkeleton";

// Lazy load heavy tab components
const DeliverablesTab = lazy(() => import("../deliverables/DeliverablesTab"));
const EventsOptimized = lazy(() =>
  import("./optimized/events/EventsOptimized").then((m) => ({
    default: m.EventsOptimized,
  }))
);
const CalendarTab = lazy(() => import("./CalendarTab"));
const InspectionTab = lazy(() => import("./InspectionTab"));
// Use optimized Specifications instead of original
const SpecificationsOptimized = lazy(() =>
  import("./optimized/SpecificationsOptimized").then((m) => ({
    default: m.SpecificationsOptimized,
  }))
);
// Use optimized Documentation instead of original (Phase 1C)
const DocumentationOptimized = lazy(() =>
  import("./optimized/documentation/DocumentationOptimized").then((m) => ({
    default: m.default,
  }))
);
// Use optimized Galleries instead of original (Phase 1E)
const GalleriesOptimized = lazy(() =>
  import("./optimized/galleries/GalleriesOptimized").then((m) => ({
    default: m.GalleriesOptimized,
  }))
);
const CarImageGallery = lazy(() =>
  import("./CarImageGallery").then((m) => ({ default: m.CarImageGallery }))
);
const CarCopywriter = lazy(() =>
  import("../copywriting/CarCopywriter").then((m) => ({
    default: m.CarCopywriter,
  }))
);

interface CarTabsProps {
  carId: string;
  vehicleInfo?: any;
}

// Loading fallback component
const TabLoadingFallback = () => <CarTabSkeleton variant="full" />;

// Wrapper component for Specifications that provides edit functionality
const SpecificationsWrapper = ({
  carId,
  vehicleInfo,
}: {
  carId: string;
  vehicleInfo: any;
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [vehicleData, setVehicleData] = useState(vehicleInfo);
  const api = useAPI();

  // Sync vehicle data when vehicleInfo prop changes
  useEffect(() => {
    setVehicleData(vehicleInfo);
  }, [vehicleInfo]);

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleSave = async (editedSpecs: any) => {
    if (!api) {
      toast.error("Authentication not ready");
      return;
    }

    try {
      const updatedCar = await api.patch(`cars/${carId}`, editedSpecs);
      setVehicleData(updatedCar);
      setIsEditMode(false);
      toast.success("Specifications saved successfully");
    } catch (error) {
      console.error("Error saving specifications:", error);
      toast.error("Failed to save specifications");
      throw error;
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  const handleRefresh = async () => {
    if (!api) {
      toast.error("Authentication not ready");
      return;
    }

    try {
      const updatedCar = await api.get(`cars/${carId}`);
      setVehicleData(updatedCar);
      toast.success("Specifications refreshed");
    } catch (error) {
      console.error("Error refreshing specifications:", error);
      toast.error("Failed to refresh specifications");
    }
  };

  return (
    <SpecificationsOptimized
      carId={carId}
      vehicleInfo={vehicleData}
      isEditMode={isEditMode}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      onRefresh={handleRefresh}
    />
  );
};

export function CarTabs({ carId, vehicleInfo }: CarTabsProps) {
  const tabItems = [
    {
      value: "gallery",
      label: "Image Gallery",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <CarImageGallery
            carId={carId}
            showFilters={true}
            vehicleInfo={vehicleInfo}
          />
        </Suspense>
      ),
    },
    {
      value: "car-galleries",
      label: "Attached Galleries",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <GalleriesOptimized carId={carId} />
        </Suspense>
      ),
    },
    {
      value: "specs",
      label: "Specifications",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <SpecificationsWrapper carId={carId} vehicleInfo={vehicleInfo} />
        </Suspense>
      ),
    },
    {
      value: "captions",
      label: "Copywriter",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <CarCopywriter carId={carId} />
        </Suspense>
      ),
    },
    {
      value: "inspections",
      label: "Inspections",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <InspectionTab carId={carId} />
        </Suspense>
      ),
    },
    {
      value: "documentation",
      label: "Documentation",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <DocumentationOptimized carId={carId} />
        </Suspense>
      ),
    },
    {
      value: "deliverables",
      label: "Deliverables",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <DeliverablesTab carId={carId} />
        </Suspense>
      ),
    },
    {
      value: "events",
      label: "Events",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <EventsOptimized carId={carId} />
        </Suspense>
      ),
    },
    {
      value: "calendar",
      label: "Calendar",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <CalendarTab carId={carId} />
        </Suspense>
      ),
    },
  ];

  return (
    <CustomTabs
      items={tabItems}
      defaultValue="gallery"
      basePath={`/cars/${carId}`}
      className="w-full"
    />
  );
}
