"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectOverviewTab } from "./ProjectOverviewTab";
import { ProjectTimelineTab } from "./ProjectTimelineTab";
import { ProjectTeamTab } from "./ProjectTeamTab";
import { ProjectAssetsTab } from "./ProjectAssetsTab";
import { ProjectDeliverablesTab } from "./ProjectDeliverablesTab";
import { ProjectCarsTab } from "./ProjectCarsTab";
import { ProjectGalleriesTab } from "./ProjectGalleriesTab";
import { ProjectCopywriter } from "./ProjectCopywriter";
import ProjectEventsTab from "./ProjectEventsTab";
import { ProjectCalendarTab } from "./ProjectCalendarTab";
import { Project } from "@/types/project";

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

export function ProjectTabs({
  project,
  activeTab,
  onTabChange,
  memberDetails,
  onProjectUpdate,
}: ProjectTabsProps) {
  const currentTab = tabs.find((tab) => tab.value === activeTab);

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

      {/* Tab Content - always visible */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <ProjectOverviewTab
            project={project}
            onProjectUpdate={onProjectUpdate}
          />
        )}

        {activeTab === "timeline" && (
          <ProjectTimelineTab
            project={project}
            onProjectUpdate={onProjectUpdate}
          />
        )}

        {activeTab === "events" && (
          <ProjectEventsTab projectId={project._id!} />
        )}

        {activeTab === "team" && (
          <ProjectTeamTab
            project={project}
            memberDetails={memberDetails}
            onProjectUpdate={onProjectUpdate}
          />
        )}

        {activeTab === "cars" && (
          <ProjectCarsTab project={project} onProjectUpdate={onProjectUpdate} />
        )}

        {activeTab === "galleries" && (
          <ProjectGalleriesTab
            project={project}
            onProjectUpdate={onProjectUpdate}
          />
        )}

        {activeTab === "assets" && (
          <ProjectAssetsTab
            project={project}
            onProjectUpdate={onProjectUpdate}
          />
        )}

        {activeTab === "deliverables" && (
          <ProjectDeliverablesTab
            project={project}
            memberDetails={memberDetails}
            onProjectUpdate={onProjectUpdate}
          />
        )}

        {activeTab === "copywriter" && (
          <ProjectCopywriter
            project={project}
            onProjectUpdate={onProjectUpdate}
          />
        )}

        {activeTab === "calendar" && (
          <ProjectCalendarTab projectId={project._id!} />
        )}
      </div>
    </div>
  );
}
