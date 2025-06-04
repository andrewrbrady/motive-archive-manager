"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Suspense, lazy, useState, useEffect } from "react";
import { Project } from "@/types/project";
import { LoadingSpinner } from "@/components/ui/loading";

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
const ProjectGalleriesTab = lazy(() =>
  import("./ProjectGalleriesTab").then((m) => ({
    default: m.ProjectGalleriesTab,
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
}

// Define tab configuration
const tabs = [
  { value: "overview", label: "Overview" },
  { value: "timeline", label: "Timeline" },
  { value: "events", label: "Events" },
  { value: "team", label: "Team" },
  { value: "cars", label: "Cars" },
  { value: "galleries", label: "Galleries" },
  { value: "assets", label: "Assets" },
  { value: "deliverables", label: "Deliverables" },
  { value: "copywriter", label: "Copywriter" },
  { value: "calendar", label: "Calendar" },
];

// Track which tabs have been loaded
const loadedTabs = new Set<string>();

export function ProjectTabs({
  project,
  activeTab,
  onTabChange,
  memberDetails,
  onProjectUpdate,
}: ProjectTabsProps) {
  const [hasLoadedTab, setHasLoadedTab] = useState<Record<string, boolean>>({
    overview: true, // Always load overview first
  });

  // Mark tab as loaded when it becomes active
  useEffect(() => {
    if (activeTab && !hasLoadedTab[activeTab]) {
      setHasLoadedTab((prev) => ({
        ...prev,
        [activeTab]: true,
      }));
      loadedTabs.add(activeTab);
    }
  }, [activeTab, hasLoadedTab]);

  const currentTab = tabs.find((tab) => tab.value === activeTab);

  // Loading fallback component
  const TabLoadingFallback = () => (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>
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
            {tabs.map((tab) => (
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
        <TabsList className="grid w-full grid-cols-10 bg-transparent border rounded-md h-auto p-1 gap-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
            >
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
            />
          </Suspense>
        )}

        {activeTab === "events" && hasLoadedTab.events && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectEventsTab projectId={project._id!} />
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
            />
          </Suspense>
        )}

        {activeTab === "galleries" && hasLoadedTab.galleries && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectGalleriesTab
              project={project}
              onProjectUpdate={onProjectUpdate}
            />
          </Suspense>
        )}

        {activeTab === "assets" && hasLoadedTab.assets && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectAssetsTab
              project={project}
              onProjectUpdate={onProjectUpdate}
            />
          </Suspense>
        )}

        {activeTab === "deliverables" && hasLoadedTab.deliverables && (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProjectDeliverablesTab
              project={project}
              memberDetails={memberDetails}
              onProjectUpdate={onProjectUpdate}
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
