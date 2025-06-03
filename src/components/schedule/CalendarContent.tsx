"use client";

import { useState, useEffect } from "react";
import { Event } from "@/types/event";
import { Deliverable } from "@/types/deliverable";
import { toast } from "sonner";
import { MotiveCalendar } from "@/components/calendar";
import { LoadingContainer } from "@/components/ui/loading";
import { useAPI } from "@/hooks/useAPI";

export default function CalendarContent() {
  const api = useAPI();
  const [events, setEvents] = useState<Event[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Early return if API not ready
  if (!api) {
    return <LoadingContainer fullHeight />;
  }

  const fetchEvents = async () => {
    try {
      const data = (await api.get(`/api/events`)) as Event[];
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events");
    }
  };

  const fetchDeliverables = async () => {
    try {
      const data = (await api.get(`/api/deliverables`)) as
        | { deliverables?: Deliverable[] }
        | Deliverable[];
      setDeliverables(Array.isArray(data) ? data : data.deliverables || []);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      toast.error("Failed to fetch deliverables");
    }
  };

  useEffect(() => {
    if (!api) return; // Guard clause

    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([fetchEvents(), fetchDeliverables()]);
      setIsLoading(false);
    };
    fetchData();
  }, [api]); // Include api in dependencies

  const handleEventDrop = async (args: any) => {
    const { event } = args;
    if (event.type === "event") {
      await fetchEvents();
    } else if (event.type === "deliverable") {
      await fetchDeliverables();
    }
  };

  const handleEventResize = async (args: any) => {
    const { event } = args;
    if (event.type === "event") {
      await fetchEvents();
    } else if (event.type === "deliverable") {
      await fetchDeliverables();
    }
  };

  if (isLoading) {
    return <LoadingContainer fullHeight />;
  }

  return (
    <div className="h-[calc(100vh-16rem)] min-h-[700px] w-full rounded-md border border-border bg-background">
      <MotiveCalendar
        carId=""
        events={events}
        deliverables={deliverables}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        showFilterControls
        showVisibilityControls
      />
    </div>
  );
}
