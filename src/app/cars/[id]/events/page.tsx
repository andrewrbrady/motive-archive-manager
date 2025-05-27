"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Event } from "@/types/event";
import EventBatchTemplates from "@/components/events/EventBatchTemplates";
import EventBatchManager from "@/components/events/EventBatchManager";
import CreateEventButton from "@/components/events/CreateEventButton";
import ListView from "@/components/events/ListView";
import { Button } from "@/components/ui/button";
import { Package, Copy, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function EventsPage({ params }: any) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBatchManager, setShowBatchManager] = useState(false);
  const [showBatchTemplates, setShowBatchTemplates] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/cars/${params.id}/events`);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  const handleUpdateEvent = async (
    eventId: string,
    updates: Partial<Event>
  ) => {
    try {
      // Optimistically update local state
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === eventId ? { ...event, ...updates } : event
        )
      );

      const response = await fetch(`/api/cars/${params.id}/events/${eventId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error("Failed to update event");
      toast.success("Event updated successfully");
    } catch (error) {
      // Revert the optimistic update on error
      fetchEvents();
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Optimistically update local state
      setEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== eventId)
      );

      const response = await fetch(`/api/cars/${params.id}/events/${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete event");
      toast.success("Event deleted successfully");
    } catch (error) {
      // Revert the optimistic update on error
      fetchEvents();
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
      throw error;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        <div className="flex justify-end items-center gap-2">
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

          <div className="border-l pl-2" />

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
        </div>

        <ListView
          events={events}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          onEventUpdated={fetchEvents}
        />

        {showBatchManager && <EventBatchManager />}

        {showBatchTemplates && (
          <EventBatchTemplates
            carId={params.id}
            onEventsCreated={fetchEvents}
          />
        )}

        {showCreateEvent && (
          <CreateEventButton carId={params.id} onEventCreated={fetchEvents} />
        )}
      </div>
    </TooltipProvider>
  );
}
