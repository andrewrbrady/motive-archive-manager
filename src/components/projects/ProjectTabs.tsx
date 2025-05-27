"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectOverviewTab } from "./ProjectOverviewTab";
import { ProjectTimelineTab } from "./ProjectTimelineTab";
import { ProjectTeamTab } from "./ProjectTeamTab";
import { ProjectAssetsTab } from "./ProjectAssetsTab";
import { ProjectDeliverablesTab } from "./ProjectDeliverablesTab";
import { ProjectCarsTab } from "./ProjectCarsTab";
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

export function ProjectTabs({
  project,
  activeTab,
  onTabChange,
  memberDetails,
  onProjectUpdate,
}: ProjectTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
      <TabsList className="grid w-full grid-cols-9 bg-transparent border rounded-md h-auto p-1 gap-1">
        <TabsTrigger
          value="overview"
          className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="timeline"
          className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
        >
          Timeline
        </TabsTrigger>
        <TabsTrigger
          value="events"
          className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
        >
          Events
        </TabsTrigger>
        <TabsTrigger
          value="team"
          className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
        >
          Team
        </TabsTrigger>
        <TabsTrigger
          value="cars"
          className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
        >
          Cars
        </TabsTrigger>
        <TabsTrigger
          value="assets"
          className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
        >
          Assets
        </TabsTrigger>
        <TabsTrigger
          value="deliverables"
          className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
        >
          Deliverables
        </TabsTrigger>
        <TabsTrigger
          value="copywriter"
          className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
        >
          Copywriter
        </TabsTrigger>
        <TabsTrigger
          value="calendar"
          className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
        >
          Calendar
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <ProjectOverviewTab
          project={project}
          onProjectUpdate={onProjectUpdate}
        />
      </TabsContent>

      <TabsContent value="timeline" className="space-y-6">
        <ProjectTimelineTab
          project={project}
          onProjectUpdate={onProjectUpdate}
        />
      </TabsContent>

      <TabsContent value="events" className="space-y-6">
        <ProjectEventsTab projectId={project._id!} />
      </TabsContent>

      <TabsContent value="team" className="space-y-6">
        <ProjectTeamTab
          project={project}
          memberDetails={memberDetails}
          onProjectUpdate={onProjectUpdate}
        />
      </TabsContent>

      <TabsContent value="cars" className="space-y-6">
        <ProjectCarsTab project={project} onProjectUpdate={onProjectUpdate} />
      </TabsContent>

      <TabsContent value="assets" className="space-y-6">
        <ProjectAssetsTab project={project} onProjectUpdate={onProjectUpdate} />
      </TabsContent>

      <TabsContent value="deliverables" className="space-y-6">
        <ProjectDeliverablesTab
          project={project}
          memberDetails={memberDetails}
          onProjectUpdate={onProjectUpdate}
        />
      </TabsContent>

      <TabsContent value="copywriter" className="space-y-6">
        <ProjectCopywriter
          project={project}
          onProjectUpdate={onProjectUpdate}
        />
      </TabsContent>

      <TabsContent value="calendar" className="space-y-6">
        <ProjectCalendarTab projectId={project._id!} />
      </TabsContent>
    </Tabs>
  );
}
