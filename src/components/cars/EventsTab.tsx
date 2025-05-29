"use client";

import { useState, useEffect } from "react";
import { Event, EventType } from "@/types/event";
import { toast } from "sonner";
import ListView from "@/components/events/ListView";
import EventBatchTemplates from "@/components/events/EventBatchTemplates";
import EventBatchManager from "@/components/events/EventBatchManager";
import JsonUploadPasteModal from "@/components/common/JsonUploadPasteModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Copy, Package, Pencil, FileJson } from "lucide-react";
import { LoadingContainer } from "@/components/ui/loading";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { EventTypeSelector } from "@/components/events/EventTypeSelector";
import {
  CustomDropdown,
  LocationDropdown,
} from "@/components/ui/custom-dropdown";

interface EventsTabProps {
  carId: string;
}

export default function EventsTab({ carId }: EventsTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBatchManager, setShowBatchManager] = useState(false);
  const [showBatchTemplates, setShowBatchTemplates] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/cars/${carId}/events`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
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

  const handleCreateEvent = async (eventData: Partial<Event>) => {
    try {
      const response = await fetch(`/api/cars/${carId}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create event");
      }

      const result = await response.json();
      toast.success("Event created successfully");

      // Close the modal and refresh events
      setShowCreateEvent(false);
      fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create event"
      );
      throw error; // Re-throw so the modal knows there was an error
    }
  };

  const handleJsonSubmit = async (jsonData: any[]) => {
    try {
      setIsSubmittingJson(true);

      const response = await fetch(`/api/cars/${carId}/events/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ events: jsonData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create events");
      }

      const result = await response.json();
      toast.success(`Successfully created ${result.count} events`);

      // Refresh the events list
      fetchEvents();
    } catch (error) {
      console.error("Error creating events from JSON:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create events"
      );
      throw error; // Re-throw to prevent modal from closing
    } finally {
      setIsSubmittingJson(false);
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
                onClick={() => setShowJsonUpload(true)}
              >
                <FileJson className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Batch Create from JSON</TooltipContent>
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

        <ListView
          events={events}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          onEventUpdated={fetchEvents}
          isEditMode={isEditMode}
        />

        {showBatchManager && <EventBatchManager />}

        {showBatchTemplates && (
          <EventBatchTemplates carId={carId} onEventsCreated={fetchEvents} />
        )}

        {/* Advanced Create Event Dialog */}
        <CreateEventDialog
          open={showCreateEvent}
          onOpenChange={setShowCreateEvent}
          onCreate={handleCreateEvent}
          carId={carId}
        />

        <JsonUploadPasteModal
          isOpen={showJsonUpload}
          onClose={() => setShowJsonUpload(false)}
          onSubmit={handleJsonSubmit}
          title="Batch Create Events from JSON"
          description="Upload a JSON file or paste JSON data to create multiple events at once. The JSON should be an array of event objects."
          expectedType="events"
          isSubmitting={isSubmittingJson}
        />
      </div>
    </TooltipProvider>
  );
}

// Advanced Create Event Dialog Component
function CreateEventDialog({
  open,
  onOpenChange,
  onCreate,
  carId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: Partial<Event>) => void;
  carId: string;
}) {
  const [formData, setFormData] = useState({
    type: EventType.DETAIL,
    title: "",
    description: "",
    url: "",
    start: "",
    end: "",
    isAllDay: false,
    locationId: "",
    teamMemberIds: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!formData.start) {
      toast.error("Start date is required");
      return;
    }

    try {
      await onCreate({
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        url: formData.url.trim() || undefined,
        locationId: formData.locationId || undefined,
        car_id: carId,
      });

      // Reset form after successful creation
      setFormData({
        type: EventType.DETAIL,
        title: "",
        description: "",
        url: "",
        start: "",
        end: "",
        isAllDay: false,
        locationId: "",
        teamMemberIds: [],
      });
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Error in form submission:", error);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form when closing
    setFormData({
      type: EventType.DETAIL,
      title: "",
      description: "",
      url: "",
      start: "",
      end: "",
      isAllDay: false,
      locationId: "",
      teamMemberIds: [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
        <DialogHeader className="flex-shrink-0 pb-2 border-b border-[hsl(var(--border-subtle))]">
          <DialogTitle className="text-xl font-bold text-[hsl(var(--foreground))] dark:text-white">
            Create New Event
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
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
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
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
                  URL (Optional)
                </Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder="Event URL"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="location"
                  className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                >
                  Location
                </Label>
                <LocationDropdown
                  value={formData.locationId}
                  onChange={(value) =>
                    setFormData({ ...formData, locationId: value })
                  }
                  placeholder="Select location"
                  className="w-full"
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
                    Start Date & Time
                  </Label>
                  <DateTimePicker
                    value={formData.start}
                    onChange={(value) =>
                      setFormData({ ...formData, start: value })
                    }
                    placeholder="Select start date and time"
                    isAllDay={formData.isAllDay}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="end"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    End Date & Time
                  </Label>
                  <DateTimePicker
                    value={formData.end}
                    onChange={(value) =>
                      setFormData({ ...formData, end: value })
                    }
                    placeholder="Select end date and time"
                    isAllDay={formData.isAllDay}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allDay"
                  checked={formData.isAllDay}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isAllDay: checked === true })
                  }
                />
                <Label htmlFor="allDay" className="text-sm font-normal">
                  All Day Event
                </Label>
              </div>
            </div>

            {/* Type Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                  Type
                </span>
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Event Type
                </Label>
                <EventTypeSelector
                  value={formData.type}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, type: value as EventType })
                  }
                  label=""
                />
              </div>
            </div>
          </form>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border-subtle))]">
          <Button variant="outline" onClick={handleClose} size="sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} size="sm">
            Create Event
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
