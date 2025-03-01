import { useState, useEffect } from "react";
import { Event, EventStatus, EventType } from "@/types/event";
import { toast } from "sonner";
import EventsCalendar from "@/components/events/EventsCalendar";
import ListView from "@/components/events/ListView";
import EventBatchTemplates from "@/components/events/EventBatchTemplates";
import EventBatchManager from "@/components/events/EventBatchManager";
import CreateEventButton from "@/components/events/CreateEventButton";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { LoadingContainer } from "@/components/ui/loading";

interface EventsTabProps {
  carId: string;
}

export default function EventsTab({ carId }: EventsTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState("list");

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching events for car:", carId);
      const response = await fetch(`/api/cars/${carId}/events`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      console.log("Received events data:", data);
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (carId) {
      fetchEvents();
    }
  }, [carId]);

  const handleUpdateEvent = async (
    eventId: string,
    updates: Partial<Event>
  ) => {
    try {
      const response = await fetch(`/api/cars/${carId}/events/${eventId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update event");
      }

      await fetchEvents();
      toast.success("Event updated successfully");
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/cars/${carId}/events/${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      await fetchEvents();
      toast.success("Event deleted successfully");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  if (isLoading) {
    return <LoadingContainer text="Loading events..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Events</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={view === "list" ? "default" : "outline"}
              onClick={() => setView("list")}
            >
              List View
            </Button>
            <Button
              variant={view === "calendar" ? "default" : "outline"}
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Calendar View
            </Button>
          </div>
          <div className="flex items-center gap-2 border-l pl-4">
            <EventBatchManager />
            <EventBatchTemplates carId={carId} onEventsCreated={fetchEvents} />
            <CreateEventButton carId={carId} onEventCreated={fetchEvents} />
          </div>
        </div>
      </div>

      {view === "list" ? (
        <ListView
          events={events}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          onEventUpdated={fetchEvents}
        />
      ) : (
        <EventsCalendar
          events={events}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      )}
    </div>
  );
}
