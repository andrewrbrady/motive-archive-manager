import { useState, useEffect } from "react";
import { Event, EventStatus, EventType } from "@/types/event";
import { toast } from "sonner";
import EventsCalendar from "@/components/events/EventsCalendar";
import ListView from "@/components/events/ListView";
import EventBatchTemplates from "@/components/events/EventBatchTemplates";
import EventBatchManager from "@/components/events/EventBatchManager";
import CreateEventButton from "@/components/events/CreateEventButton";
import { Button } from "@/components/ui/button";
import { CalendarDays, List, Package, Plus, Copy, Pencil } from "lucide-react";
import { LoadingContainer } from "@/components/ui/loading";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EventsTabProps {
  carId: string;
}

export default function EventsTab({ carId }: EventsTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState("list");
  const [showBatchManager, setShowBatchManager] = useState(false);
  const [showBatchTemplates, setShowBatchTemplates] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

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
    return <LoadingContainer />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        <div className="flex justify-end items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setView("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>List View</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={view === "calendar" ? "default" : "outline"}
                size="icon"
                onClick={() => setView("calendar")}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Calendar View</TooltipContent>
          </Tooltip>

          <div className="border-l pl-2" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="icon"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit All</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowBatchManager(true)}
              >
                <Package className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Batch Manager</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowBatchTemplates(true)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create from Template</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowCreateEvent(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Event</TooltipContent>
          </Tooltip>
        </div>

        {view === "list" ? (
          <ListView
            events={events}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onEventUpdated={fetchEvents}
            isEditMode={isEditMode}
          />
        ) : (
          <EventsCalendar
            events={events}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            isEditMode={isEditMode}
          />
        )}

        {showBatchManager && <EventBatchManager />}

        {showBatchTemplates && (
          <EventBatchTemplates carId={carId} onEventsCreated={fetchEvents} />
        )}

        {showCreateEvent && (
          <CreateEventButton carId={carId} onEventCreated={fetchEvents} />
        )}
      </div>
    </TooltipProvider>
  );
}
