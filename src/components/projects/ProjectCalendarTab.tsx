"use client";

import { useState, useEffect } from "react";
import { Event } from "@/types/event";
import { Deliverable } from "@/types/deliverable";
import { ProjectMilestone } from "@/types/project";
import { toast } from "sonner";
import { MotiveCalendar } from "@/components/calendar";
import { Loader2 } from "lucide-react";
import { LoadingContainer } from "@/components/ui/loading";
import { useAPI } from "@/hooks/useAPI";

interface ProjectCalendarTabProps {
  projectId: string;
}

export function ProjectCalendarTab({ projectId }: ProjectCalendarTabProps) {
  const api = useAPI();
  const [events, setEvents] = useState<Event[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    if (!api) return;

    try {
      console.time("ProjectCalendarTab-fetch-events");
      // Request more events for calendar display - increase limit to show more events
      const response = (await api.get(
        `projects/${projectId}/events?limit=500&includeCars=true`
      )) as {
        events: Event[];
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
      // Extract events array from response
      setEvents(response.events || []);
    } catch (error) {
      console.error("Error fetching project events:", error);
      toast.error("Failed to fetch events");
    } finally {
      console.timeEnd("ProjectCalendarTab-fetch-events");
    }
  };

  const fetchDeliverables = async () => {
    if (!api) return;

    try {
      console.time("ProjectCalendarTab-fetch-deliverables");
      const data = (await api.get(`projects/${projectId}/deliverables`)) as {
        deliverables: Deliverable[];
      };
      setDeliverables(data.deliverables || []);
    } catch (error) {
      console.error("Error fetching project deliverables:", error);
      toast.error("Failed to fetch deliverables");
    } finally {
      console.timeEnd("ProjectCalendarTab-fetch-deliverables");
    }
  };

  const fetchProject = async () => {
    if (!api) return;

    try {
      console.time("ProjectCalendarTab-fetch-project");
      const data = (await api.get(`projects/${projectId}`)) as {
        project: { timeline: { milestones: ProjectMilestone[] } };
      };
      setMilestones(data.project.timeline.milestones || []);
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Failed to fetch project milestones");
    } finally {
      console.timeEnd("ProjectCalendarTab-fetch-project");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!api) return;

      setIsLoading(true);
      console.time("ProjectCalendarTab-parallel-fetch");
      await Promise.all([fetchEvents(), fetchDeliverables(), fetchProject()]);
      setIsLoading(false);
      console.timeEnd("ProjectCalendarTab-parallel-fetch");
    };
    fetchData();
  }, [projectId, api]);

  const handleEventDrop = async (args: any) => {
    // After the MotiveCalendar component handles the event drop, refresh the data
    const { event } = args;
    if (event.type === "event") {
      await fetchEvents();
    } else if (event.type === "deliverable") {
      await fetchDeliverables();
    } else if (event.type === "milestone") {
      await fetchProject();
    }
  };

  const handleEventResize = async (args: any) => {
    // After the MotiveCalendar component handles the event resize, refresh the data
    const { event } = args;
    if (event.type === "event") {
      await fetchEvents();
    } else if (event.type === "deliverable") {
      await fetchDeliverables();
    } else if (event.type === "milestone") {
      await fetchProject();
    }
  };

  const handleSelectEvent = (event: any) => {
    // Implementation for event selection
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Event selected:", event);
  };

  const handleDeliverableUpdate = async () => {
    // Refresh deliverables data when a deliverable is updated
    await fetchDeliverables();
  };

  return (
    <div className="flex h-full w-full flex-col">
      {isLoading || !api ? (
        <LoadingContainer fullHeight />
      ) : (
        <div className="flex h-full w-full flex-1 flex-col">
          <MotiveCalendar
            projectId={projectId}
            events={events}
            deliverables={deliverables}
            milestones={milestones}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            onDeliverableUpdate={handleDeliverableUpdate}
            className="flex-1"
            style={{
              minHeight: "700px",
              height: "calc(100vh - 220px)",
              border: "none",
              overflow: "hidden",
            }}
          />
        </div>
      )}
    </div>
  );
}
