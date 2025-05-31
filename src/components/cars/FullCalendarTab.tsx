"use client";

import { useState, useEffect } from "react";
import { Event } from "@/types/event";
import { Deliverable } from "@/types/deliverable";
import { toast } from "sonner";
import { FullCalendar } from "@/components/calendar";
import { Loader2 } from "lucide-react";
import { LoadingContainer } from "@/components/ui/loading";
import { useAPI } from "@/hooks/useAPI";
import { toast as hotToast } from "react-hot-toast";

interface FullCalendarTabProps {
  carId: string;
}

export default function FullCalendarTab({ carId }: FullCalendarTabProps) {
  const api = useAPI();
  const [events, setEvents] = useState<Event[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    if (!api) return;

    try {
      const data = await api.get<Event[]>(`cars/${carId}/events`);
      setEvents(data);
    } catch (error: any) {
      console.error("Error fetching events:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch events";
      hotToast.error(errorMessage);
      toast.error(errorMessage);
    }
  };

  const fetchDeliverables = async () => {
    if (!api) return;

    try {
      const data = await api.get<Deliverable[]>(`cars/${carId}/deliverables`);
      setDeliverables(data);
    } catch (error: any) {
      console.error("Error fetching deliverables:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch deliverables";
      hotToast.error(errorMessage);
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    if (!api) return;

    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([fetchEvents(), fetchDeliverables()]);
      setIsLoading(false);
    };
    fetchData();
  }, [carId, api]);

  // Authentication guard
  if (!api) {
    return <LoadingContainer fullHeight />;
  }

  const handleEventDrop = async (args: any) => {
    // After the FullCalendar component handles the event drop, refresh the data
    const { event } = args;
    if (event.extendedProps.type === "event") {
      await fetchEvents();
    } else if (event.extendedProps.type === "deliverable") {
      await fetchDeliverables();
    }
  };

  const handleEventResize = async (args: any) => {
    // After the FullCalendar component handles the event resize, refresh the data
    const { event } = args;
    if (event.extendedProps.type === "event") {
      await fetchEvents();
    } else if (event.extendedProps.type === "deliverable") {
      await fetchDeliverables();
    }
  };

  const handleSelectEvent = (event: any) => {
    // Implementation for event selection
    // [REMOVED] // [REMOVED] console.log("Event selected:", event);
  };

  return (
    <div className="flex h-full w-full flex-col">
      {isLoading ? (
        <LoadingContainer fullHeight />
      ) : (
        <div className="flex h-full w-full flex-1 flex-col">
          <FullCalendar
            carId={carId}
            events={events}
            deliverables={deliverables}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            onSelectEvent={handleSelectEvent}
            className="flex-1"
            style={{
              border: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
