"use client";

import React, { Suspense, lazy, useState, useEffect } from "react";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { LoadingSpinner } from "@/components/ui/loading";
import { CarImageGallery } from "./CarImageGallery";
import { toast } from "react-hot-toast";

// Lazy load heavy tab components
const DeliverablesTab = lazy(() => import("../deliverables/DeliverablesTab"));
const EventsTab = lazy(() => import("./EventsTab"));
const ProductionTab = lazy(() => import("./ProductionTab"));
const CalendarTab = lazy(() => import("./CalendarTab"));
const InspectionTab = lazy(() => import("./InspectionTab"));
const Specifications = lazy(() => import("./Specifications"));
const CarGalleries = lazy(() => import("./CarGalleries"));
const CarCopywriter = lazy(() =>
  import("./CarCopywriter").then((m) => ({ default: m.CarCopywriter }))
);
const Scripts = lazy(() => import("./Scripts"));
const ShotList = lazy(() => import("./ShotList"));

// Import components that might not be lazy-loaded
import DocumentationFiles from "../DocumentationFiles";

interface CarTabsProps {
  carId: string;
  vehicleInfo?: any;
}

// Loading fallback component
const TabLoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <LoadingSpinner size="lg" />
  </div>
);

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

  // Sync vehicle data when vehicleInfo prop changes
  useEffect(() => {
    setVehicleData(vehicleInfo);
  }, [vehicleInfo]);

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleSave = async (editedSpecs: any) => {
    try {
      const response = await fetch(`/api/cars/${carId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedSpecs),
      });

      if (!response.ok) {
        throw new Error("Failed to save specifications");
      }

      const updatedCar = await response.json();
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
    try {
      const response = await fetch(`/api/cars/${carId}`);
      if (response.ok) {
        const updatedCar = await response.json();
        setVehicleData(updatedCar);
        toast.success("Specifications refreshed");
      }
    } catch (error) {
      console.error("Error refreshing specifications:", error);
      toast.error("Failed to refresh specifications");
    }
  };

  return (
    <Specifications
      car={vehicleData}
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
        <CarImageGallery
          carId={carId}
          showFilters={true}
          vehicleInfo={vehicleInfo}
        />
      ),
    },
    {
      value: "car-galleries",
      label: "Attached Galleries",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <CarGalleries carId={carId} />
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
      value: "shoots",
      label: "Photo Shoots",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <ProductionTab carId={carId} />
        </Suspense>
      ),
    },
    {
      value: "shot-lists",
      label: "Shot Lists",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <ShotList carId={carId} />
        </Suspense>
      ),
    },
    {
      value: "scripts",
      label: "Scripts",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <Scripts carId={carId} />
        </Suspense>
      ),
    },
    {
      value: "bat",
      label: "BaT Listing",
      content: (
        <div className="p-6 text-center text-muted-foreground">
          <p>BaT Listing functionality coming soon...</p>
        </div>
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
      content: <DocumentationFiles carId={carId} />,
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
          <EventsTab carId={carId} />
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
