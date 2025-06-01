"use client";

import { useState, useEffect } from "react";
import { Event } from "@/types/event";
import { Deliverable } from "@/types/deliverable";
import { toast } from "sonner";
import { MotiveCalendar } from "@/components/calendar";
import { Loader2 } from "lucide-react";
import { LoadingContainer } from "@/components/ui/loading";
import { useAPI } from "@/hooks/useAPI";

interface CalendarTabProps {
  carId: string;
}

export default function CalendarTab({ carId }: CalendarTabProps) {
  const api = useAPI();
  const [events, setEvents] = useState<Event[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCalendarData = async () => {
      if (!api) return;

      try {
        setIsLoading(true);

        // Fetch events and deliverables in parallel using authenticated API
        const [eventsData, deliverablesData] = await Promise.all([
          api.get(`cars/${carId}/events`) as Promise<Event[]>,
          api.get(`cars/${carId}/deliverables`) as Promise<Deliverable[]>,
        ]);

        setEvents(eventsData || []);
        setDeliverables(deliverablesData || []);
      } catch (error) {
        console.error("Error fetching calendar data:", error);
        toast.error("Failed to load calendar data");
        setEvents([]);
        setDeliverables([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarData();
  }, [carId, api]);

  const handleEventDrop = async (args: any) => {
    // After the MotiveCalendar component handles the event drop, refresh the data
    if (!api) return;

    try {
      const [eventsData, deliverablesData] = await Promise.all([
        api.get(`cars/${carId}/events`) as Promise<Event[]>,
        api.get(`cars/${carId}/deliverables`) as Promise<Deliverable[]>,
      ]);
      setEvents(eventsData || []);
      setDeliverables(deliverablesData || []);
    } catch (error) {
      console.error("Error refreshing calendar data:", error);
    }
  };

  const handleEventResize = async (args: any) => {
    // After the MotiveCalendar component handles the event resize, refresh the data
    if (!api) return;

    try {
      const [eventsData, deliverablesData] = await Promise.all([
        api.get(`cars/${carId}/events`) as Promise<Event[]>,
        api.get(`cars/${carId}/deliverables`) as Promise<Deliverable[]>,
      ]);
      setEvents(eventsData || []);
      setDeliverables(deliverablesData || []);
    } catch (error) {
      console.error("Error refreshing calendar data:", error);
    }
  };

  const handleSelectEvent = (event: any) => {
    // Implementation for event selection
    // [REMOVED] // [REMOVED] console.log("Event selected:", event);
  };

  if (!api || isLoading) {
    return <LoadingContainer />;
  }

  return (
    <div className="space-y-6">
      <MotiveCalendar
        carId={carId}
        events={events}
        deliverables={deliverables}
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
  );
}
