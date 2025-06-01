"use client";

import { useState, useEffect, useCallback } from "react";
import { Event, EventType } from "@/types/event";
import { toast } from "sonner";
import ListView from "@/components/events/ListView";
import EventBatchTemplates from "@/components/events/EventBatchTemplates";
import EventBatchManager from "@/components/events/EventBatchManager";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ChevronsUpDown,
  Check,
  Copy,
  Package,
  Save,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
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
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { EventTypeSelector } from "./EventTypeSelector";
import { Checkbox } from "@/components/ui/checkbox";
import { TeamMemberPicker } from "@/components/ui/team-member-picker";
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { useAPI } from "@/hooks/useAPI";

interface Option {
  label: string;
  value: string;
}

interface NewEvent {
  type: EventType;
  title: string;
  description: string;
  url: string;
  start: string;
  end?: string;
  teamMemberIds: string[];
  isAllDay: boolean;
}

export default function EventsTab({ carId }: { carId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useAPI();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [newEvent, setNewEvent] = useState<NewEvent>({
    type: EventType.DETAIL,
    title: "",
    description: "",
    url: "",
    start: "",
    end: "",
    teamMemberIds: [],
    isAllDay: false,
  });

  // Get the view from URL params or default to "list"
  const urlView = searchParams?.get("view");
  const view = urlView === "grid" ? "calendar" : urlView || "list";

  const updateViewInUrl = (newView: string) => {
    // Create a new URLSearchParams object from the current params
    const params = new URLSearchParams(searchParams?.toString() || "");
    // Update or add the view parameter
    params.set("view", newView);
    // Keep other existing parameters
    const existingParams = Array.from(searchParams?.entries() || []).filter(
      ([key]) => key !== "view"
    );
    existingParams.forEach(([key, value]) => {
      params.set(key, value);
    });
    // Update the URL without refreshing the page
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const fetchEvents = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      console.log("Fetching events for car:", carId); // Debug log

      const data = (await api.get(`cars/${carId}/events`)) as Event[];

      console.log("Received events data:", data); // Debug log

      // Transform the data to match our Event interface
      const transformedEvents: Event[] = data.map((event: any) => ({
        id: event.id,
        car_id: event.car_id,
        project_id: event.project_id,
        type: event.type,
        title: event.title || "",
        description: event.description || "",
        url: event.url || "",
        start: event.start,
        end: event.end,
        isAllDay: event.isAllDay || false,
        teamMemberIds: event.teamMemberIds || [],
        locationId: event.locationId,
        primaryImageId: event.primaryImageId,
        imageIds: event.imageIds || [],
        createdBy: event.createdBy || "",
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      }));

      console.log("Transformed events:", transformedEvents); // Debug log
      setEvents(transformedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events");
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (carId && api) {
      fetchEvents();
    }
  }, [carId, api]);

  const handleUpdateEvent = async (
    eventId: string,
    updates: Partial<Event>
  ) => {
    if (!api) return;

    try {
      // Optimistically update local state
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === eventId ? { ...event, ...updates } : event
        )
      );

      await api.put(`cars/${carId}/events/${eventId}`, updates);
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
    if (!api) return;

    try {
      // Optimistically update local state
      setEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== eventId)
      );

      await api.delete(`cars/${carId}/events/${eventId}`);
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
    if (!api) return;

    try {
      await api.post(`cars/${carId}/events`, {
        type: newEvent.type,
        title: newEvent.title,
        description: newEvent.description,
        url: newEvent.url,
        start: newEvent.start,
        end: newEvent.end,
        teamMemberIds: newEvent.teamMemberIds,
        isAllDay: newEvent.isAllDay,
      });

      await fetchEvents();
      setIsAddingEvent(false);
      setNewEvent({
        type: EventType.DETAIL,
        title: "",
        description: "",
        url: "",
        start: "",
        end: "",
        teamMemberIds: [],
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
      <div className="flex items-center justify-end">
        <TooltipProvider delayDuration={0}>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsAddingEvent(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Event</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isBatchMode ? "default" : "outline"}
                  size="icon"
                  onClick={() => setIsBatchMode(!isBatchMode)}
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
                  onClick={() => setIsAddingEvent(true)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Templates</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isEditMode ? "default" : "outline"}
                  size="icon"
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  {isEditMode ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isEditMode ? "Save All" : "Edit All"}
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <ListView
        events={events}
        onUpdateEvent={handleUpdateEvent}
        onDeleteEvent={handleDeleteEvent}
        onEventUpdated={fetchEvents}
        isEditMode={isEditMode}
      />

      <Dialog open={isAddingEvent} onOpenChange={setIsAddingEvent}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
          <DialogHeader className="flex-shrink-0 pb-2 border-b border-[hsl(var(--border-subtle))]">
            <DialogTitle className="text-xl font-bold text-[hsl(var(--foreground))] dark:text-white">
              Create New Event
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddEvent();
              }}
              className="space-y-4"
            >
              {/* Basic Information Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                  <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                    Basic Information
                  </span>
                  <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="title"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({
                        ...newEvent,
                        title: e.target.value,
                      })
                    }
                    placeholder="Event title"
                    required
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) =>
                      setNewEvent({
                        ...newEvent,
                        description: e.target.value,
                      })
                    }
                    placeholder="Event description"
                    className="text-sm"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="url"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    URL
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    value={newEvent.url}
                    onChange={(e) =>
                      setNewEvent({
                        ...newEvent,
                        url: e.target.value,
                      })
                    }
                    placeholder="https://example.com"
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Schedule Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                  <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                    Schedule
                  </span>
                  <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="start"
                      className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                    >
                      Start {newEvent.isAllDay ? "Date" : "Date & Time"} *
                    </Label>
                    <DateTimePicker
                      value={newEvent.start}
                      onChange={(value) =>
                        setNewEvent({ ...newEvent, start: value })
                      }
                      required
                      className="text-sm"
                      isAllDay={newEvent.isAllDay}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="end"
                      className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                    >
                      End {newEvent.isAllDay ? "Date" : "Date & Time"}
                    </Label>
                    <DateTimePicker
                      value={newEvent.end || ""}
                      onChange={(value) =>
                        setNewEvent({ ...newEvent, end: value })
                      }
                      className="text-sm"
                      isAllDay={newEvent.isAllDay}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <CustomCheckbox
                    id="allDay"
                    checked={newEvent.isAllDay}
                    onCheckedChange={(checked) =>
                      setNewEvent({ ...newEvent, isAllDay: checked as boolean })
                    }
                    label="All Day Event"
                  />
                </div>
              </div>

              {/* Event Type Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                  <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                    Event Type
                  </span>
                  <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                    Event Type
                  </Label>
                  <EventTypeSelector
                    value={newEvent.type}
                    onValueChange={(value: string) =>
                      setNewEvent({ ...newEvent, type: value as EventType })
                    }
                    label=""
                    className="space-y-2"
                  />
                </div>
              </div>

              {/* Team Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                  <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                    Team
                  </span>
                  <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                    Team Members
                  </Label>
                  <TeamMemberPicker
                    selectedMemberIds={newEvent.teamMemberIds}
                    onSelectionChange={(memberIds: string[]) =>
                      setNewEvent({ ...newEvent, teamMemberIds: memberIds })
                    }
                    placeholder="Select team members"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Footer with buttons */}
          <div className="flex-shrink-0 pt-4 border-t border-[hsl(var(--border-subtle))] flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddingEvent(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddEvent}>
              Create Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="hidden">
        <EventBatchManager />
        <EventBatchTemplates carId={carId} onEventsCreated={fetchEvents} />
      </div>
    </div>
  );
}
