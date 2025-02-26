"use client";

import { useState, useEffect } from "react";
import { Event } from "@/types/event";
import { Deliverable } from "@/types/deliverable";
import { toast } from "sonner";
import { MotiveCalendar } from "@/components/calendar";
import { Loader2 } from "lucide-react";

interface CalendarTabProps {
  carId: string;
}

export default function CalendarTab({ carId }: CalendarTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/cars/${carId}/events`);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events");
    }
  };

  const fetchDeliverables = async () => {
    try {
      const response = await fetch(`/api/cars/${carId}/deliverables`);
      if (!response.ok) throw new Error("Failed to fetch deliverables");
      const data = await response.json();
      setDeliverables(data);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      toast.error("Failed to fetch deliverables");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([fetchEvents(), fetchDeliverables()]);
      setIsLoading(false);
    };
    fetchData();
  }, [carId]);

  const handleEventDrop = async (args: any) => {
    // After the MotiveCalendar component handles the event drop, refresh the data
    const { event } = args;
    if (event.type === "event") {
      await fetchEvents();
    } else if (event.type === "deliverable") {
      await fetchDeliverables();
    }
  };

  const handleEventResize = async (args: any) => {
    // After the MotiveCalendar component handles the event resize, refresh the data
    const { event } = args;
    if (event.type === "event") {
      await fetchEvents();
    } else if (event.type === "deliverable") {
      await fetchDeliverables();
    }
  };

  const handleSelectEvent = (event: any) => {
    // Implementation for event selection
    console.log("Event selected:", event);
  };

  return (
    <div className="flex h-full w-full flex-col">
      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex h-full w-full flex-1 flex-col">
          <MotiveCalendar
            carId={carId}
            events={events}
            deliverables={deliverables}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            className="flex-1"
            style={{ minHeight: "700px" }}
          />
        </div>
      )}
    </div>
  );
}
