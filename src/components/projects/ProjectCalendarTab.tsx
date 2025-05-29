"use client";

import { useState, useEffect } from "react";
import { Event } from "@/types/event";
import { Deliverable } from "@/types/deliverable";
import { ProjectMilestone } from "@/types/project";
import { toast } from "sonner";
import { MotiveCalendar } from "@/components/calendar";
import { Loader2 } from "lucide-react";
import { LoadingContainer } from "@/components/ui/loading";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

interface ProjectCalendarTabProps {
  projectId: string;
}

export function ProjectCalendarTab({ projectId }: ProjectCalendarTabProps) {
  const { user } = useFirebaseAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    if (!user) {
      console.log("No user available for fetching events");
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/projects/${projectId}/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching project events:", error);
      toast.error("Failed to fetch events");
    }
  };

  const fetchDeliverables = async () => {
    if (!user) {
      console.log("No user available for fetching deliverables");
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/projects/${projectId}/deliverables`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch deliverables");
      const data = await response.json();
      setDeliverables(data.deliverables || []);
    } catch (error) {
      console.error("Error fetching project deliverables:", error);
      toast.error("Failed to fetch deliverables");
    }
  };

  const fetchProject = async () => {
    if (!user) {
      console.log("No user available for fetching project");
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch project");
      const data = await response.json();
      setMilestones(data.project.timeline.milestones || []);
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Failed to fetch project milestones");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setIsLoading(true);
      await Promise.all([fetchEvents(), fetchDeliverables(), fetchProject()]);
      setIsLoading(false);
    };
    fetchData();
  }, [projectId, user]);

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
    console.log("Event selected:", event);
  };

  return (
    <div className="flex h-full w-full flex-col">
      {isLoading ? (
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
