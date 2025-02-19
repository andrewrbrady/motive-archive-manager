"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Event, EventStatus, EventType } from "@/types/event";
import { toast } from "sonner";
import EventsCalendar from "./EventsCalendar";
import ListView from "./ListView";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSearchParams, useRouter } from "next/navigation";
import EventBatchTemplates from "./EventBatchTemplates";

interface NewEvent {
  type: EventType;
  description: string;
  start: string;
  end?: string;
  assignee: string;
  status: EventStatus;
  isAllDay: boolean;
}

export default function EventsTab({ carId }: { carId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEvent>({
    type: EventType.DETAIL,
    description: "",
    start: "",
    end: "",
    assignee: "",
    status: EventStatus.NOT_STARTED,
    isAllDay: false,
  });

  // Get the view from URL params or default to "list"
  const view = searchParams.get("view") || "list";

  const updateViewInUrl = (newView: string) => {
    // Create a new URLSearchParams object from the current params
    const params = new URLSearchParams(searchParams.toString());
    // Update or add the view parameter
    params.set("view", newView);
    // Update the URL without refreshing the page
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching events for car:", carId); // Debug log
      const response = await fetch(`/api/cars/${carId}/events`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData); // Debug log
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      console.log("Received events data:", data); // Debug log

      // Transform the data to match our Event interface
      const transformedEvents: Event[] = data.map((event: any) => ({
        id: event.id,
        car_id: event.car_id,
        description: event.description || "",
        type: event.type,
        status: event.status,
        start: event.start,
        end: event.end,
        assignee: event.assignee || "",
        isAllDay: event.isAllDay || false,
      }));

      console.log("Transformed events:", transformedEvents); // Debug log
      setEvents(transformedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [carId]);

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

      const response = await fetch(`/api/cars/${carId}/events/${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      toast.success("Event deleted successfully");
    } catch (error) {
      // Revert the optimistic update on error
      fetchEvents();
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
      throw error;
    }
  };

  const handleAddEvent = async () => {
    try {
      const response = await fetch(`/api/cars/${carId}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: newEvent.type,
          description: newEvent.description,
          scheduled_date: newEvent.start,
          end_date: newEvent.end,
          assignee: newEvent.assignee,
          status: newEvent.status,
          is_all_day: newEvent.isAllDay,
          car_id: carId,
        }),
      });

      if (!response.ok) throw new Error("Failed to create event");
      await fetchEvents();
      setIsAddingEvent(false);
      setNewEvent({
        type: EventType.DETAIL,
        description: "",
        start: "",
        end: "",
        assignee: "",
        status: EventStatus.NOT_STARTED,
        isAllDay: false,
      });
      toast.success("Event created successfully");
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    }
  };

  if (isLoading) {
    return <div>Loading events...</div>;
  }

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={updateViewInUrl} className="w-full">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <EventBatchTemplates carId={carId} onEventsCreated={fetchEvents} />
            <Dialog open={isAddingEvent} onOpenChange={setIsAddingEvent}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Event Type</Label>
                    <Select
                      value={newEvent.type}
                      onValueChange={(value) =>
                        setNewEvent({ ...newEvent, type: value as EventType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(EventType).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newEvent.description}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="datetime-local"
                      value={newEvent.start}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, start: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>End Date (Optional)</Label>
                    <Input
                      type="datetime-local"
                      value={newEvent.end}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, end: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Assignee</Label>
                    <Input
                      value={newEvent.assignee}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, assignee: e.target.value })
                      }
                      placeholder="Enter assignee name"
                    />
                  </div>
                  <Button onClick={handleAddEvent}>Create Event</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="list" className="mt-6">
          <ListView
            events={events}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onEventUpdated={fetchEvents}
          />
        </TabsContent>
        <TabsContent value="calendar" className="mt-6">
          <EventsCalendar
            events={events}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
