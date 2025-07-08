"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useSession } from "@/hooks/useFirebaseAuth";
import { useAPI } from "@/hooks/useAPI";
import { Event, EventType } from "@/types/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PageTitle } from "@/components/ui/PageTitle";
import { LoadingContainer } from "@/components/ui/loading-container";
import EventBatchTemplates from "@/components/events/EventBatchTemplates";
import EventBatchManager from "@/components/events/EventBatchManager";
import ListView from "@/components/events/ListView";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, FileJson, Package, Copy, Plus } from "lucide-react";
import JsonUploadPasteModal from "@/components/common/JsonUploadPasteModal";
import {
  CustomDropdown,
  LocationDropdown,
} from "@/components/ui/custom-dropdown";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { EventTypeSelector } from "@/components/events/EventTypeSelector";
import { Checkbox } from "@/components/ui/checkbox";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { Loader2 } from "lucide-react";

interface EventsTabProps {
  carId: string;
}

export default function EventsTab({ carId }: EventsTabProps) {
  const { data: session, status } = useSession();

  // Show consistent loading state during authentication
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading events...</p>
          <p className="text-xs text-muted-foreground">
            You can switch tabs while this loads
          </p>
        </div>
      </div>
    );
  }

  // Authentication guard
  if (status !== "authenticated" || !session?.user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">
          Please sign in to view events
        </div>
      </div>
    );
  }

  return <EventsTabContent carId={carId} />;
}

function EventsTabContent({ carId }: EventsTabProps) {
  const api = useAPI();

  // Phase 3A optimization: Convert blocking useEffect + await api.get to non-blocking useAPIQuery
  const {
    data: events = [],
    isLoading,
    error,
    refetch: fetchEvents,
  } = useAPIQuery<Event[]>(`cars/${carId}/events`, {
    staleTime: 3 * 60 * 1000, // 3 minutes cache for events data
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    // Handle API response variations
    select: (data: any) => {
      return Array.isArray(data) ? data : [];
    },
  });

  // State management for UI features
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [showBatchManager, setShowBatchManager] = useState(false);
  const [showBatchTemplates, setShowBatchTemplates] = useState(false);
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);

  // Non-blocking error handling
  if (error) {
    console.error("Error fetching events:", error);
  }

  // Memoized event handlers for better performance
  const handleUpdateEvent = useCallback(
    async (eventId: string, updates: Partial<Event>) => {
      if (!api) return;

      try {
        await api.put(`cars/${carId}/events/${eventId}`, updates);

        // Refresh events data
        await fetchEvents();

        toast.success("Event updated successfully");
      } catch (error) {
        console.error("Error updating event:", error);
        toast.error("Failed to update event");
        throw error;
      }
    },
    [api, carId, fetchEvents]
  );

  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      if (!api) return;

      try {
        await api.delete(`cars/${carId}/events/${eventId}`);

        // Refresh events data
        await fetchEvents();

        toast.success("Event deleted successfully");
      } catch (error) {
        console.error("Error deleting event:", error);
        toast.error("Failed to delete event");
        throw error;
      }
    },
    [api, carId, fetchEvents]
  );

  const handleCreateEvent = useCallback(
    async (eventData: Partial<Event>) => {
      if (!api) return;

      try {
        await api.post(`cars/${carId}/events`, eventData);

        // Refresh events data and close modal
        await fetchEvents();
        setShowCreateEvent(false);

        toast.success("Event created successfully");
      } catch (error) {
        console.error("Error creating event:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to create event"
        );
        throw error;
      }
    },
    [api, carId, fetchEvents]
  );

  const handleJsonSubmit = useCallback(
    async (jsonData: any[]) => {
      if (!api) return;

      try {
        setIsSubmittingJson(true);

        const result = (await api.post(`cars/${carId}/events/batch`, {
          events: jsonData,
        })) as { count: number };

        // Refresh events data
        await fetchEvents();

        toast.success(`Successfully created ${result.count} events`);
      } catch (error) {
        console.error("Error creating events from JSON:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to create events"
        );
        throw error;
      } finally {
        setIsSubmittingJson(false);
      }
    },
    [api, carId, fetchEvents]
  );

  // Phase 3A improvement: Non-blocking loading state with tab switching message
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-muted/30 border border-muted rounded-md p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Loading events...
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            You can switch tabs while this loads
          </p>
        </div>
        <LoadingContainer />
      </div>
    );
  }

  // Non-blocking error display
  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/15 border border-destructive/20 rounded-md p-3">
          <p className="text-destructive text-sm">
            Failed to load events. Tab switching is still available.
          </p>
          <button
            onClick={() => fetchEvents()}
            className="text-xs underline text-destructive hover:no-underline mt-2"
          >
            Retry Events
          </button>
        </div>
      </div>
    );
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
