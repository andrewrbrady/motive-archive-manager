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
    } catch (error: any) {
      console.error("Error fetching project events:", error);

      // Handle specific error cases
      if (error.status === 404) {
        toast.error("Project not found or you don't have access to it");
      } else if (error.status === 403) {
        toast.error("Access denied to project events");
      } else if (error.status === 401) {
        toast.error("Authentication required. Please sign in again.");
      } else {
        toast.error("Failed to fetch events");
      }

      // Set empty events so calendar still loads
      setEvents([]);
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
    } catch (error: any) {
      console.error("Error fetching project deliverables:", error);

      // Handle specific error cases
      if (error.status === 404) {
        toast.error("Project not found or you don't have access to it");
      } else if (error.status === 403) {
        toast.error("Access denied to project deliverables");
      } else if (error.status === 401) {
        toast.error("Authentication required. Please sign in again.");
      } else {
        toast.error("Failed to fetch deliverables");
      }

      // Set empty deliverables so calendar still loads
      setDeliverables([]);
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
      setMilestones(data.project.timeline?.milestones || []);
    } catch (error: any) {
      console.error("Error fetching project:", error);

      // Handle specific error cases
      if (error.status === 404) {
        toast.error("Project not found or you don't have access to it");
      } else if (error.status === 403) {
        toast.error("Access denied to this project");
      } else if (error.status === 401) {
        toast.error("Authentication required. Please sign in again.");
      } else {
        toast.error("Failed to fetch project milestones");
      }

      // Set empty milestones so calendar still loads
      setMilestones([]);
    } finally {
      console.timeEnd("ProjectCalendarTab-fetch-project");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!api) return;

      setIsLoading(true);
      console.time("ProjectCalendarTab-parallel-fetch");

      try {
        // Use Promise.allSettled to allow calendar to load even if some requests fail
        const results = await Promise.allSettled([
          fetchEvents(),
          fetchDeliverables(),
          fetchProject(),
        ]);

        // Check if all requests failed
        const allFailed = results.every(
          (result) => result.status === "rejected"
        );
        if (allFailed) {
          toast.error(
            "Failed to load calendar data. Please check your access permissions."
          );
        }
      } catch (error) {
        console.error("Error in parallel fetch:", error);
        toast.error("Failed to load calendar data");
      } finally {
        setIsLoading(false);
        console.timeEnd("ProjectCalendarTab-parallel-fetch");
      }
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
