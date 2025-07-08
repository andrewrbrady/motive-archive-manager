"use client";

import React, {
  Suspense,
  lazy,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { LoadingSpinner } from "@/components/ui/loading";
import { toast } from "react-hot-toast";
import { useAPI } from "@/hooks/useAPI";
import { usePrefetchAPI } from "@/hooks/useAPIQuery";

// Lazy load heavy tab components with better chunking
const DeliverablesTab = lazy(() =>
  import("../deliverables/DeliverablesTab").then((module) => ({
    default: module.default,
  }))
);

const EventsOptimized = lazy(() =>
  import("./optimized/events/EventsOptimized").then((m) => ({
    default: m.EventsOptimized,
  }))
);

const CalendarTab = lazy(() =>
  import("./CalendarTab").then((module) => ({
    default: module.default,
  }))
);

const InspectionTab = lazy(() =>
  import("./InspectionTab").then((module) => ({
    default: module.default,
  }))
);

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

const UnifiedCopywriter = lazy(() =>
  import("../copywriting/UnifiedCopywriter").then((m) => ({
    default: m.UnifiedCopywriter,
  }))
);

// Add AI Chat Tab
const AIChatTab = lazy(() =>
  import("../ai-chat/AIChatTab").then((m) => ({
    default: m.AIChatTab,
  }))
);

// Add Content Studio Tab
const ContentStudioTab = lazy(() =>
  import("../content-studio/ContentStudioTab").then((m) => ({
    default: m.ContentStudioTab,
  }))
);

interface CarTabsProps {
  carId: string;
  vehicleInfo?: any;
}

// Improved loading fallback component with immediate feedback
const TabLoadingFallback = React.memo(() => (
  <div className="space-y-4">
    {/* Immediate feedback that tab switch happened */}
    <div className="bg-muted/20 border border-muted rounded-md p-3">
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">
          Loading tab content...
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        ✅ Tab switched successfully - Content loading in background
      </p>
    </div>

    {/* Skeleton content to show structure immediately */}
    <div className="space-y-3">
      <div className="h-8 bg-muted/30 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 bg-muted/20 rounded animate-pulse" />
        <div className="h-32 bg-muted/20 rounded animate-pulse" />
      </div>
      <div className="h-24 bg-muted/15 rounded animate-pulse" />
    </div>
  </div>
));
TabLoadingFallback.displayName = "TabLoadingFallback";

// Memoized wrapper component for Specifications that provides edit functionality
const SpecificationsWrapper = React.memo(
  ({ carId, vehicleInfo }: { carId: string; vehicleInfo: any }) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [vehicleData, setVehicleData] = useState(vehicleInfo);
    const api = useAPI();

    // Sync vehicle data when vehicleInfo prop changes
    useEffect(() => {
      setVehicleData(vehicleInfo);
    }, [vehicleInfo]);

    const handleEdit = useCallback(() => {
      setIsEditMode(true);
    }, []);

    const handleSave = useCallback(
      async (editedSpecs: any) => {
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
      },
      [api, carId]
    );

    const handleCancel = useCallback(() => {
      setIsEditMode(false);
    }, []);

    const handleRefresh = useCallback(() => {
      // Refresh specifications data if needed
      window.location.reload();
    }, []);

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
  },
  (prevProps, nextProps) => {
    // Simple comparison - avoid expensive JSON.stringify
    return prevProps.carId === nextProps.carId;
  }
);
SpecificationsWrapper.displayName = "SpecificationsWrapper";

// Simplified memoized wrapper components - remove expensive comparisons
const MemoizedCarImageGallery = React.memo(
  ({ carId, vehicleInfo }: { carId: string; vehicleInfo: any }) => (
    <CarImageGallery
      carId={carId}
      showFilters={true}
      vehicleInfo={vehicleInfo}
    />
  ),
  (prevProps, nextProps) => {
    // Simple comparison only
    return prevProps.carId === nextProps.carId;
  }
);
MemoizedCarImageGallery.displayName = "MemoizedCarImageGallery";

const MemoizedGalleriesOptimized = React.memo(
  ({ carId }: { carId: string }) => <GalleriesOptimized carId={carId} />,
  (prevProps, nextProps) => prevProps.carId === nextProps.carId
);
MemoizedGalleriesOptimized.displayName = "MemoizedGalleriesOptimized";

const MemoizedUnifiedCopywriter = React.memo(
  ({ carId }: { carId: string }) => (
    <UnifiedCopywriter carId={carId} showClientHandle={true} />
  ),
  (prevProps, nextProps) => prevProps.carId === nextProps.carId
);
MemoizedUnifiedCopywriter.displayName = "MemoizedUnifiedCopywriter";

const MemoizedInspectionTab = React.memo(
  ({ carId }: { carId: string }) => <InspectionTab carId={carId} />,
  (prevProps, nextProps) => prevProps.carId === nextProps.carId
);
MemoizedInspectionTab.displayName = "MemoizedInspectionTab";

const MemoizedDocumentationOptimized = React.memo(
  ({ carId }: { carId: string }) => <DocumentationOptimized carId={carId} />,
  (prevProps, nextProps) => prevProps.carId === nextProps.carId
);
MemoizedDocumentationOptimized.displayName = "MemoizedDocumentationOptimized";

const MemoizedDeliverablesTab = React.memo(
  ({ carId }: { carId: string }) => <DeliverablesTab carId={carId} />,
  (prevProps, nextProps) => prevProps.carId === nextProps.carId
);
MemoizedDeliverablesTab.displayName = "MemoizedDeliverablesTab";

const MemoizedEventsOptimized = React.memo(
  ({ carId }: { carId: string }) => <EventsOptimized carId={carId} />,
  (prevProps, nextProps) => prevProps.carId === nextProps.carId
);
MemoizedEventsOptimized.displayName = "MemoizedEventsOptimized";

const MemoizedCalendarTab = React.memo(
  ({ carId }: { carId: string }) => <CalendarTab carId={carId} />,
  (prevProps, nextProps) => prevProps.carId === nextProps.carId
);
MemoizedCalendarTab.displayName = "MemoizedCalendarTab";

const MemoizedAIChatTab = React.memo(
  ({ carId, vehicleInfo }: { carId: string; vehicleInfo: any }) => (
    <AIChatTab entityType="car" entityId={carId} entityInfo={vehicleInfo} />
  ),
  (prevProps, nextProps) => prevProps.carId === nextProps.carId
);
MemoizedAIChatTab.displayName = "MemoizedAIChatTab";

const MemoizedContentStudioTab = React.memo(
  ({ carId, vehicleInfo }: { carId: string; vehicleInfo: any }) => (
    <ContentStudioTab carId={carId} carInfo={vehicleInfo} />
  ),
  (prevProps, nextProps) => prevProps.carId === nextProps.carId
);
MemoizedContentStudioTab.displayName = "MemoizedContentStudioTab";

export function CarTabs({ carId, vehicleInfo }: CarTabsProps) {
  const { prefetch } = usePrefetchAPI();

  // Performance optimization: Memoize vehicleInfo to prevent unnecessary re-renders
  // Use a stable key that only changes when the data actually changes
  const memoizedVehicleInfo = useMemo(() => {
    if (!vehicleInfo) return null;
    return vehicleInfo;
  }, [
    vehicleInfo?._id,
    vehicleInfo?.make,
    vehicleInfo?.model,
    vehicleInfo?.year,
  ]); // Only update when core car data changes

  // Optimized prefetch function with debouncing to prevent excessive calls
  const prefetchTabData = useCallback(
    async (tabValue: string) => {
      try {
        switch (tabValue) {
          case "inspections":
            await prefetch(`cars/${carId}/inspections`, 5 * 60 * 1000); // 5 min cache
            break;
          case "events":
            await prefetch(`cars/${carId}/events`, 5 * 60 * 1000);
            break;
          case "gallery":
            // Gallery data is likely already cached, but prefetch if needed
            await prefetch(`cars/${carId}/images?limit=25`, 2 * 60 * 1000); // 2 min cache
            break;
          case "documentation":
            await prefetch(`cars/${carId}/documentation`, 3 * 60 * 1000); // 3 min cache
            break;
          default:
            // No prefetch needed for other tabs
            break;
        }
      } catch (error) {
        // Silently handle prefetch errors - they shouldn't block UX
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.debug("Prefetch error for tab", tabValue, error);
      }
    },
    [carId, prefetch]
  );

  // PERFORMANCE CRITICAL: Simplified tab items with minimal dependencies
  // Memoized with stable dependency to prevent re-creation on every render
  const tabItems = useMemo(
    () => [
      {
        value: "gallery",
        label: "Image Gallery",
        content: (
          <Suspense fallback={<TabLoadingFallback />}>
            <MemoizedCarImageGallery
              carId={carId}
              vehicleInfo={memoizedVehicleInfo}
            />
          </Suspense>
        ),
      },
      {
        value: "car-galleries",
        label: "Attached Galleries",
        content: (
          <Suspense fallback={<TabLoadingFallback />}>
            <MemoizedGalleriesOptimized carId={carId} />
          </Suspense>
        ),
      },
      {
        value: "specs",
        label: "Specifications",
        content: (
          <Suspense fallback={<TabLoadingFallback />}>
            <SpecificationsWrapper
              carId={carId}
              vehicleInfo={memoizedVehicleInfo}
            />
          </Suspense>
        ),
      },
      {
        value: "captions",
        label: "Copywriter",
        content: (
          <Suspense fallback={<TabLoadingFallback />}>
            <MemoizedUnifiedCopywriter carId={carId} />
          </Suspense>
        ),
      },
      {
        value: "content-studio",
        label: "Content Studio",
        content: (
          <Suspense fallback={<TabLoadingFallback />}>
            <MemoizedContentStudioTab
              carId={carId}
              vehicleInfo={memoizedVehicleInfo}
            />
          </Suspense>
        ),
      },
      {
        value: "ai-chat",
        label: "AI Assistant",
        content: (
          <Suspense fallback={<TabLoadingFallback />}>
            <MemoizedAIChatTab
              carId={carId}
              vehicleInfo={memoizedVehicleInfo}
            />
          </Suspense>
        ),
      },
      {
        value: "inspections",
        label: "Inspections",
        content: (
          <Suspense fallback={<TabLoadingFallback />}>
            <MemoizedInspectionTab carId={carId} />
          </Suspense>
        ),
      },
      {
        value: "documentation",
        label: "Documentation",
        content: (
          <Suspense fallback={<TabLoadingFallback />}>
            <MemoizedDocumentationOptimized carId={carId} />
          </Suspense>
        ),
      },
      {
        value: "deliverables",
        label: "Deliverables",
        content: (
          <Suspense fallback={<TabLoadingFallback />}>
            <MemoizedDeliverablesTab carId={carId} />
          </Suspense>
        ),
      },
      {
        value: "events",
        label: "Events",
        content: (
          <Suspense fallback={<TabLoadingFallback />}>
            <MemoizedEventsOptimized carId={carId} />
          </Suspense>
        ),
      },
      {
        value: "calendar",
        label: "Calendar",
        content: (
          <Suspense fallback={<TabLoadingFallback />}>
            <MemoizedCalendarTab carId={carId} />
          </Suspense>
        ),
      },
    ],
    [carId, memoizedVehicleInfo] // Only recreate when carId or vehicleInfo actually changes
  );

  return (
    <CustomTabs
      items={tabItems}
      defaultValue="gallery"
      basePath={`/cars/${carId}`}
      className="w-full"
    />
  );
}
