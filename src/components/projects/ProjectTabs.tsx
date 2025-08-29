"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React, {
  Suspense,
  lazy,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Project, ProjectTimeline } from "@/types/project";
import { LoadingSpinner } from "@/components/ui/loading";
import { Event } from "@/types/event";

// Define types for SSR optimization (compatible with both tab interfaces)
interface EventCar {
  _id: string;
  make: string;
  model: string;
  year: number;
  primaryImageId?: string;
}

interface ProjectCar {
  _id: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  vin?: string;
  status: string;
  primaryImageId?: string;
  imageIds?: string[];
  images?: Array<{
    _id: string;
    url: string;
    metadata?: {
      isPrimary?: boolean;
    };
  }>;
  createdAt: string;
}

interface EventWithCar extends Event {
  car?: EventCar;
  isAttached?: boolean;
}

// Lazy load heavy tab components
const ProjectOverviewTab = lazy(() =>
  import("./ProjectOverviewTab").then((m) => ({
    default: m.ProjectOverviewTab,
  }))
);
const ProjectTimelineTab = lazy(() =>
  import("./ProjectTimelineTab").then((m) => ({
    default: m.ProjectTimelineTab,
  }))
);
const ProjectTeamTab = lazy(() =>
  import("./ProjectTeamTab").then((m) => ({ default: m.ProjectTeamTab }))
);
const ProjectAssetsTab = lazy(() =>
  import("./ProjectAssetsTab").then((m) => ({ default: m.ProjectAssetsTab }))
);
const ProjectDeliverablesTab = lazy(() =>
  import("./ProjectDeliverablesTab").then((m) => ({
    default: m.ProjectDeliverablesTab,
  }))
);
const ProjectCarsTab = lazy(() =>
  import("./ProjectCarsTab").then((m) => ({ default: m.ProjectCarsTab }))
);
const ProjectModelsTab = lazy(() =>
  import("./ProjectModelsTab").then((m) => ({ default: m.ProjectModelsTab }))
);
const ProjectGalleriesTab = lazy(() =>
  import("./ProjectGalleriesTab").then((m) => ({
    default: m.ProjectGalleriesTab,
  }))
);
const ProjectImageGallery = lazy(() =>
  import("./ProjectImageGallery").then((m) => ({
    default: m.ProjectImageGallery,
  }))
);
const UnifiedCopywriter = lazy(() =>
  import("../copywriting/UnifiedCopywriter").then((m) => ({
    default: m.UnifiedCopywriter,
  }))
);
const ProjectEventsTab = lazy(() => import("./ProjectEventsTab"));
const ProjectCalendarTab = lazy(() =>
  import("./ProjectCalendarTab").then((m) => ({
    default: m.ProjectCalendarTab,
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

interface MemberDetails {
  name: string;
  email: string;
  image?: string;
}

interface ProjectTabsProps {
  project: Project;
  activeTab: string;
  onTabChange: (tab: string) => void;
  memberDetails: Record<string, MemberDetails>;
  onProjectUpdate: () => void;
  preloadedEvents?: EventWithCar[]; // Optional pre-fetched events data for SSR optimization
  preloadedCars?: ProjectCar[]; // Optional pre-fetched cars data for SSR optimization
  preloadedModels?: any[]; // Optional pre-fetched models data for SSR optimization
  preloadedGalleries?: any[]; // Optional pre-fetched galleries data for SSR optimization
  preloadedAssets?: any[]; // Optional pre-fetched assets data for SSR optimization
  preloadedDeliverables?: any[]; // Optional pre-fetched deliverables data for SSR optimization
  preloadedTimelineData?: ProjectTimeline; // Optional pre-fetched timeline data for SSR optimization
  preloadedCopywriterData?: { cars: any[]; events: any[]; captions: any[] }; // Optional pre-fetched copywriter data for SSR optimization
}

// Define tab configuration OUTSIDE component to prevent re-creation
const TABS = [
  { value: "overview", label: "Overview" },
  { value: "timeline", label: "Timeline" },
  { value: "events", label: "Events" },
  { value: "team", label: "Team" },
  { value: "cars", label: "Cars" },
  { value: "models", label: "Models" },
  { value: "images", label: "Images" },
  { value: "galleries", label: "Galleries" },
  { value: "assets", label: "Assets" },
  { value: "deliverables", label: "Deliverables" },
  { value: "copywriter", label: "Copywriter" },
  { value: "content-studio", label: "Content Studio" },
  { value: "ai-chat", label: "AI Assistant" },
  { value: "calendar", label: "Calendar" },
] as const;

// Loading fallback component OUTSIDE to prevent re-creation
const TabLoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <LoadingSpinner size="lg" />
  </div>
);

function ProjectTabsComponent({
  project,
  activeTab,
  onTabChange,
  memberDetails,
  onProjectUpdate,
  preloadedEvents,
  preloadedCars,
  preloadedModels,
  preloadedGalleries,
  preloadedAssets,
  preloadedDeliverables,
  preloadedTimelineData,
  preloadedCopywriterData,
}: ProjectTabsProps) {
  const [hasLoadedTab, setHasLoadedTab] = useState<Record<string, boolean>>({
    overview: true, // Always load overview
    // Preload critical tabs that are most commonly accessed
    events: true,
    cars: true,
    models: true,
    images: true,
  });

  // Preload remaining tabs after initial render for better UX
  useEffect(() => {
    const preloadTimer = setTimeout(() => {
      setHasLoadedTab((prev) => ({
        ...prev,
        timeline: true,
        team: true,
        galleries: true,
        assets: true,
        deliverables: true,
        copywriter: true,
        "content-studio": true,
        "ai-chat": true,
        calendar: true,
      }));
    }, 1000); // Preload after 1 second

    return () => clearTimeout(preloadTimer);
  }, []);

  // Mark tab as loaded when it becomes active (fallback)
  useEffect(() => {
    if (activeTab) {
      setHasLoadedTab((prev) => {
        // Only update if the tab is not already loaded to prevent unnecessary re-renders
        if (!prev[activeTab]) {
          return {
            ...prev,
            [activeTab]: true,
          };
        }
        return prev; // Return same object reference to prevent re-render
      });
    }
  }, [activeTab]); // Only depend on activeTab - use functional update to read current state

  // Memoize currentTab to prevent re-computation
  const currentTab = useMemo(
    () => TABS.find((tab) => tab.value === activeTab),
    [activeTab]
  );

  return (
    <div className="space-y-6">
      {/* Mobile Dropdown - visible on small screens */}
      <div className="block lg:hidden">
        <Select value={activeTab} onValueChange={onTabChange}>
          <SelectTrigger className="w-full">
            <SelectValue>{currentTab?.label || "Select Tab"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TABS.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Tabs - hidden on small screens */}
      <Tabs
        value={activeTab}
        onValueChange={onTabChange}
        className="hidden lg:block space-y-6"
      >
        {/* Use shared tabs styling but remove the bottom border for projects */}
        <TabsList className="flex flex-wrap w-full border-b-0">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Tab Content - lazy loaded */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectOverviewTab
              project={project}
              onProjectUpdate={onProjectUpdate}
            />
          </Suspense>
        )}

        {activeTab === "timeline" && hasLoadedTab.timeline && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectTimelineTab
              project={project}
              onProjectUpdate={onProjectUpdate}
              initialTimelineData={preloadedTimelineData}
            />
          </Suspense>
        )}

        {activeTab === "events" && hasLoadedTab.events && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectEventsTab
              projectId={project._id!}
              initialEvents={preloadedEvents}
            />
          </Suspense>
        )}

        {activeTab === "team" && hasLoadedTab.team && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectTeamTab
              project={project}
              memberDetails={memberDetails}
              onProjectUpdate={onProjectUpdate}
            />
          </Suspense>
        )}

        {activeTab === "cars" && hasLoadedTab.cars && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectCarsTab
              project={project}
              onProjectUpdate={onProjectUpdate}
              initialCars={preloadedCars}
            />
          </Suspense>
        )}

        {activeTab === "models" && hasLoadedTab.models && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectModelsTab
              project={project}
              onProjectUpdate={onProjectUpdate}
              initialModels={preloadedModels}
            />
          </Suspense>
        )}

        {activeTab === "images" && hasLoadedTab.images && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectImageGallery
              projectId={project._id!}
              projectInfo={project}
            />
          </Suspense>
        )}

        {activeTab === "galleries" && hasLoadedTab.galleries && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectGalleriesTab
              project={project}
              onProjectUpdate={onProjectUpdate}
              initialGalleries={preloadedGalleries}
            />
          </Suspense>
        )}

        {activeTab === "assets" && hasLoadedTab.assets && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectAssetsTab
              project={project}
              onProjectUpdate={onProjectUpdate}
              initialAssets={preloadedAssets}
            />
          </Suspense>
        )}

        {activeTab === "deliverables" && hasLoadedTab.deliverables && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectDeliverablesTab
              project={project}
              memberDetails={memberDetails}
              onProjectUpdate={onProjectUpdate}
              initialDeliverables={preloadedDeliverables}
            />
          </Suspense>
        )}

        {activeTab === "copywriter" && hasLoadedTab.copywriter && (
          <Suspense fallback={<TabLoadingFallback />}>
            <UnifiedCopywriter
              projectId={project._id!}
              title="Project Copywriter"
              allowMultipleCars={true}
              allowEventSelection={true}
              allowMinimalCarData={true}
              onProjectUpdate={onProjectUpdate}
              initialCopywriterData={preloadedCopywriterData}
            />
          </Suspense>
        )}

        {activeTab === "content-studio" && hasLoadedTab["content-studio"] && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ContentStudioTab
              projectId={project._id!}
              projectInfo={project}
              onUpdate={onProjectUpdate}
            />
          </Suspense>
        )}

        {activeTab === "ai-chat" && hasLoadedTab["ai-chat"] && (
          <Suspense fallback={<TabLoadingFallback />}>
            <AIChatTab
              entityType="project"
              entityId={project._id!}
              entityInfo={project}
            />
          </Suspense>
        )}

        {activeTab === "calendar" && hasLoadedTab.calendar && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectCalendarTab projectId={project._id!} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const ProjectTabs = React.memo(ProjectTabsComponent);
