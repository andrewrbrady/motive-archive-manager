"use client";

import React, { Suspense, lazy } from "react";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { LoadingSpinner } from "@/components/ui/loading";
import { CarImageGallery } from "./CarImageGallery";

// Lazy load heavy tab components
const DeliverablesTab = lazy(() => import("../deliverables/DeliverablesTab"));
const EventsTab = lazy(() => import("./EventsTab"));
const ProductionTab = lazy(() => import("./ProductionTab"));
const CalendarTab = lazy(() => import("./CalendarTab"));
const InspectionTab = lazy(() => import("./InspectionTab"));
const Specifications = lazy(() => import("./Specifications"));
const CarGalleries = lazy(() => import("./CarGalleries"));
const ArticleGenerator = lazy(() => import("./ArticleGenerator"));
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
          <Specifications car={vehicleInfo} />
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
      value: "article",
      label: "Article",
      content: (
        <Suspense fallback={<TabLoadingFallback />}>
          <ArticleGenerator carId={carId} />
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
