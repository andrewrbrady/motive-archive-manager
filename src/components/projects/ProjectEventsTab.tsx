"use client";

import { useState, useEffect } from "react";
import type { Event } from "@/types/event";
import { EventType } from "@/types/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Calendar,
  Clock,
  User,
  Camera,
  Video,
  Search,
  Wrench,
  Sparkles,
  Package,
  Truck,
  MoreHorizontal,
  Link as LinkIcon,
  Filter,
  List,
  Pencil,
  Copy,
  Grid3X3,
  FileJson,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CustomDropdown,
  LocationDropdown,
} from "@/components/ui/custom-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import EventCard from "@/components/events/EventCard";
import EditEventDialog from "@/components/events/EditEventDialog";
import ListView from "@/components/events/ListView";
import JsonUploadPasteModal from "@/components/common/JsonUploadPasteModal";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { EventTypeSelector } from "@/components/events/EventTypeSelector";
import { LoadingContainer } from "@/components/ui/loading";
import { useAPI } from "@/hooks/useAPI";
import { formatEventDateTime } from "@/lib/dateUtils";

interface ProjectEventsTabProps {
  projectId: string;
  initialEvents?: EventWithCar[]; // Optional pre-fetched events data for SSR optimization
}

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
  primaryImageId?: string;
}

interface EventWithCar extends Event {
  car?: Car;
  isAttached?: boolean; // Flag to distinguish attached vs created events
}

// Icon mapping for event types
const getEventTypeIcon = (type: EventType) => {
  switch (type) {
    case EventType.PRODUCTION:
      return <Camera className="w-4 h-4 flex-shrink-0" />;
    case EventType.POST_PRODUCTION:
      return <Video className="w-4 h-4 flex-shrink-0" />;
    case EventType.MARKETING:
      return <Sparkles className="w-4 h-4 flex-shrink-0" />;
    case EventType.INSPECTION:
      return <Search className="w-4 h-4 flex-shrink-0" />;
    case EventType.DETAIL:
      return <Wrench className="w-4 h-4 flex-shrink-0" />;
    case EventType.PICKUP:
      return <Package className="w-4 h-4 flex-shrink-0" />;
    case EventType.DELIVERY:
      return <Truck className="w-4 h-4 flex-shrink-0" />;
    default:
      return <MoreHorizontal className="w-4 h-4 flex-shrink-0" />;
  }
};

export default function ProjectEventsTab({
  projectId,
  initialEvents,
}: ProjectEventsTabProps) {
  const api = useAPI();
  const [events, setEvents] = useState<EventWithCar[]>(initialEvents || []);
  const [isLoading, setIsLoading] = useState(!initialEvents); // Don't show loading if we have initial data
  const [view, setView] = useState<"list" | "grid">("list");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showAttachEvent, setShowAttachEvent] = useState(false);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showEditEvent, setShowEditEvent] = useState(false);

  const fetchEvents = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      console.time("ProjectEventsTab-parallel-fetch");

      // ✅ FIXED: Replace manual fetch() with useAPI() - removes NUCLEAR AUTH violation
      const response = (await api.get(`projects/${projectId}/events`)) as {
        events: Event[];
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };

      // Extract events array from response
      const events = response.events || [];

      // Fetch car information for events that have car_id in parallel
      const eventsWithCars = await Promise.all(
        events.map(async (event: Event) => {
          try {
            let car: Car | undefined = undefined;
            if (event.car_id) {
              try {
                // ✅ FIXED: Replace manual fetch() with useAPI() - removes NUCLEAR AUTH violation
                car = (await api.get(`cars/${event.car_id}`)) as Car;
              } catch (carError) {
                // Silently handle car fetch errors - car might not exist or be inaccessible
                console.warn(
                  `Car ${event.car_id} could not be fetched for event ${event.id}`
                );
                car = undefined;
              }
            }

            // Check if this event was created specifically for this project
            // vs attached from elsewhere
            const isCreatedForProject = event.project_id === projectId;

            return {
              ...event,
              car,
              isAttached: !isCreatedForProject,
            };
          } catch (error) {
            // This should rarely happen since we handle car errors separately
            console.warn(
              `Error processing event ${event.id}:`,
              error instanceof Error ? error.message : "Unknown error"
            );
            return {
              ...event,
              car: undefined,
              isAttached: event.project_id !== projectId,
            };
          }
        })
      );

      setEvents(eventsWithCars);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events");
    } finally {
      setIsLoading(false);
      console.timeEnd("ProjectEventsTab-parallel-fetch");
    }
  };

  useEffect(() => {
    // Only fetch if we don't have initial data and API is available
    if (projectId && api && !initialEvents) {
      fetchEvents();
    }
  }, [projectId, api, initialEvents]);

  const handleCreateEvent = async (eventData: Partial<Event>) => {
    if (!api) return;

    try {
      // ✅ FIXED: Replace manual fetch() with useAPI() - removes NUCLEAR AUTH violation
      await api.post(`projects/${projectId}/events`, eventData);

      await fetchEvents();
      toast.success("Event created successfully");
      setShowCreateEvent(false);
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    }
  };

  const handleAttachEvent = async (eventId: string) => {
    if (!api) return;

    try {
      // ✅ FIXED: Replace manual fetch() with useAPI() - removes NUCLEAR AUTH violation
      await api.post(`projects/${projectId}/events/attach`, { eventId });

      await fetchEvents();
      toast.success("Event attached successfully");
      setShowAttachEvent(false);
    } catch (error) {
      console.error("Error attaching event:", error);
      toast.error("Failed to attach event");
    }
  };

  const handleDetachEvent = async (eventId: string) => {
    if (!api) return;

    try {
      // ✅ FIXED: Replace manual fetch() with useAPI() - removes NUCLEAR AUTH violation
      await api.post(`projects/${projectId}/events/detach`, { eventId });

      await fetchEvents();
      toast.success("Event detached successfully");
    } catch (error) {
      console.error("Error detaching event:", error);
      toast.error("Failed to detach event");
    }
  };

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

      // ✅ FIXED: Replace manual fetch() with useAPI() - removes NUCLEAR AUTH violation
      await api.put(`projects/${projectId}/events/${eventId}`, updates);

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

      // ✅ FIXED: Replace manual fetch() with useAPI() - removes NUCLEAR AUTH violation
      await api.delete(`projects/${projectId}/events/${eventId}`);

      toast.success("Event deleted successfully");
    } catch (error) {
      // Revert the optimistic update on error
      fetchEvents();
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
      throw error;
    }
  };

  const handleBatchDeleteEvent = async (eventIds: string[]) => {
    if (!api) return;

    try {
      // Optimistically update local state
      setEvents((currentEvents) =>
        currentEvents.filter((event) => !eventIds.includes(event.id))
      );

      // Use the new batch delete endpoint
      await api.deleteWithBody(`projects/${projectId}/events/batch`, {
        eventIds,
      });

      toast.success(`Successfully deleted ${eventIds.length} events`);
    } catch (error) {
      // Revert the optimistic update on error
      fetchEvents();
      console.error("Error batch deleting events:", error);
      toast.error("Failed to delete events");
      throw error;
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowEditEvent(true);
  };

  const handleJsonSubmit = async (jsonData: any[]) => {
    if (!api) return;

    try {
      setIsSubmittingJson(true);

      // ✅ FIXED: Replace manual fetch() with useAPI() - removes NUCLEAR AUTH violation
      const result = (await api.post(`projects/${projectId}/events/batch`, {
        events: jsonData,
      })) as { count: number };

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

  // Show loading if API is not ready yet
  if (!api || isLoading) {
    return <LoadingContainer />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        {/* Header with View Controls */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Events</h2>
            <p className="text-muted-foreground">
              Manage project events and milestones
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle Controls */}
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
                  variant={view === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setView("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Grid View</TooltipContent>
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

            <div className="border-l pl-2" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowJsonUpload(true)}
                >
                  <FileJson className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Batch Create from JSON</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => setShowAttachEvent(true)}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Attach Event
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach Existing Event</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setShowCreateEvent(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create New Event</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Conditional View Rendering */}
        {view === "list" ? (
          <ListView
            events={events}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onBatchDeleteEvent={handleBatchDeleteEvent}
            onDetachEvent={handleDetachEvent}
            onEventUpdated={fetchEvents}
            isEditMode={isEditMode}
          />
        ) : /* Grid View - Original Implementation */
        events.length === 0 ? (
          <Card>
            <CardContent className="pt-4">
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first event or attach an existing one
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowAttachEvent(true)}
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Attach Event
                  </Button>
                  <Button onClick={() => setShowCreateEvent(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Event
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="group relative">
                <EventCard
                  event={event}
                  onEdit={handleEditEvent}
                  onDelete={
                    event.isAttached
                      ? () => handleDetachEvent(event.id)
                      : handleDeleteEvent
                  }
                />
                {event.isAttached && (
                  <Badge
                    variant="secondary"
                    className="absolute top-2 right-2 text-xs"
                  >
                    <LinkIcon className="w-3 h-3 mr-1" />
                    Attached
                  </Badge>
                )}
                {event.car && (
                  <Badge
                    variant="outline"
                    className="absolute bottom-2 left-2 text-xs"
                  >
                    {event.car.year} {event.car.make} {event.car.model}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Event Dialog */}
        <CreateEventDialog
          open={showCreateEvent}
          onOpenChange={setShowCreateEvent}
          onCreate={handleCreateEvent}
        />

        {/* Attach Event Dialog */}
        <AttachEventDialog
          open={showAttachEvent}
          onOpenChange={setShowAttachEvent}
          onAttach={handleAttachEvent}
          projectId={projectId}
        />

        {/* Edit Event Dialog */}
        <EditEventDialog
          event={editingEvent}
          open={showEditEvent}
          onOpenChange={setShowEditEvent}
          onUpdate={handleUpdateEvent}
        />

        {/* JSON Upload Modal */}
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

// Create event dialog component matching caption generator modal styling
function CreateEventDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: Partial<Event>) => void;
}) {
  const [formData, setFormData] = useState({
    type: EventType.PRODUCTION,
    title: "",
    description: "",
    start: "",
    end: "",
    isAllDay: false,
    locationId: "",
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
        locationId: formData.locationId || undefined,
        teamMemberIds: [], // Start with empty team
      });

      // Reset form after successful creation
      setFormData({
        type: EventType.PRODUCTION,
        title: "",
        description: "",
        start: "",
        end: "",
        isAllDay: false,
        locationId: "",
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
      type: EventType.PRODUCTION,
      title: "",
      description: "",
      start: "",
      end: "",
      isAllDay: false,
      locationId: "",
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

// Attach event dialog component
function AttachEventDialog({
  open,
  onOpenChange,
  onAttach,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttach: (eventId: string) => void;
  projectId: string;
}) {
  const api = useAPI();
  const [availableEvents, setAvailableEvents] = useState<EventWithCar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    type: "all",
    search: "",
  });

  const formatEventType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatDate = (dateString: string | undefined | null) => {
    return formatEventDateTime(dateString);
  };

  const fetchAvailableEvents = async () => {
    if (!api) {
      console.error("❌ API client not available - user not authenticated");
      setError("Authentication required. Please sign in and try again.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("🔍 DEBUG: Starting to fetch available events");

      const queryParams = new URLSearchParams();
      // Set a high limit to get all events for the attach modal
      queryParams.append("limit", "1000"); // Get up to 1000 events
      queryParams.append("pageSize", "1000"); // Alternative parameter name

      if (filters.type && filters.type !== "all") {
        queryParams.append("type", filters.type);
      }

      // ✅ FIXED: Replace manual fetch() with useAPI() - removes NUCLEAR AUTH violation
      const eventsResponse = await api.get(`events?${queryParams.toString()}`);
      // Handle both array response and object response with events property
      let data: Event[] = [];
      if (Array.isArray(eventsResponse)) {
        data = eventsResponse as Event[];
      } else if (
        eventsResponse &&
        typeof eventsResponse === "object" &&
        "events" in eventsResponse
      ) {
        data = (eventsResponse as any).events || [];
      } else {
        data = [];
      }

      // Filter out events that are already attached to this project
      let projectEvents: Event[] = [];
      try {
        // ✅ FIXED: Replace manual fetch() with useAPI() - removes NUCLEAR AUTH violation
        const projectEventsResponse = await api.get(
          `projects/${projectId}/events`
        );
        // Handle both array response and object response with events property
        if (Array.isArray(projectEventsResponse)) {
          projectEvents = projectEventsResponse as Event[];
        } else if (
          projectEventsResponse &&
          typeof projectEventsResponse === "object" &&
          "events" in projectEventsResponse
        ) {
          projectEvents = (projectEventsResponse as any).events || [];
        } else {
          projectEvents = [];
        }
      } catch (error) {
        console.warn("Could not fetch project events for filtering:", error);
        // Continue without filtering - better to show all events than none
        projectEvents = [];
      }

      const attachedEventIds = new Set(projectEvents.map((e: Event) => e.id));

      // Debug logging to understand what's happening
      console.log("🔍 DEBUG: All events fetched:", data.length);
      console.log("🔍 DEBUG: Project events:", projectEvents.length);
      console.log("🔍 DEBUG: Looking for event ID: 686d6224dc1f14e26c3d697a");
      console.log(
        "🔍 DEBUG: Event with car_id 6784b0e37a85711f907ba1e6:",
        data.find((e) => e.car_id === "6784b0e37a85711f907ba1e6")
      );

      // Fetch car information for events that have car_id in parallel
      const eventsWithCars = await Promise.all(
        data
          .filter((event: Event) => {
            const isAttached = attachedEventIds.has(event.id);
            if (event.car_id === "6784b0e37a85711f907ba1e6") {
              console.log(
                `🔍 DEBUG: Event ${event.id} (${event.title}) - isAttached: ${isAttached}`
              );
            }
            return !isAttached;
          })
          .map(async (event: Event) => {
            try {
              if (event.car_id) {
                // ✅ FIXED: Replace manual fetch() with useAPI() - removes NUCLEAR AUTH violation
                const car = (await api.get(`cars/${event.car_id}`)) as Car;
                return { ...event, car };
              }
              return event;
            } catch (error) {
              console.error("Error fetching car:", error);
              return event;
            }
          })
      );

      setAvailableEvents(eventsWithCars);
    } catch (error) {
      console.error("Error fetching available events:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch available events";
      setError(errorMessage);
      toast.error(errorMessage);
      setAvailableEvents([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && api) {
      fetchAvailableEvents();
    }
  }, [open, filters, projectId, api]);

  const handleAttachSelected = async () => {
    if (selectedEvents.size === 0) {
      toast.error("Please select at least one event to attach");
      return;
    }

    try {
      for (const eventId of selectedEvents) {
        await onAttach(eventId);
      }
      setSelectedEvents(new Set());
      onOpenChange(false);
    } catch (error) {
      console.error("Error attaching events:", error);
    }
  };

  const toggleEventSelection = (eventId: string) => {
    const newSelection = new Set(selectedEvents);
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId);
    } else {
      newSelection.add(eventId);
    }
    setSelectedEvents(newSelection);
  };

  const filteredEvents = availableEvents.filter((event) => {
    const matchesSearch =
      !filters.search ||
      (event.title &&
        event.title.toLowerCase().includes(filters.search.toLowerCase())) ||
      (event.description &&
        event.description.toLowerCase().includes(filters.search.toLowerCase()));

    return matchesSearch;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
        <DialogHeader className="flex-shrink-0 pb-2 border-b border-[hsl(var(--border-subtle))]">
          <DialogTitle className="text-xl font-bold text-[hsl(var(--foreground))] dark:text-white">
            Attach Existing Events
          </DialogTitle>
          <DialogDescription>
            Select events from the system to attach to this project
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="flex gap-4 mb-4 flex-shrink-0">
            <div className="flex-1">
              <Input
                placeholder="Search events..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="text-sm"
              />
            </div>
            <div className="w-48">
              <Select
                value={filters.type}
                onValueChange={(value) =>
                  setFilters({ ...filters, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.values(EventType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatEventType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Events Table */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading events...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-red-600">
                    Error Loading Events
                  </h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      fetchAvailableEvents();
                    }}
                    size="sm"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No events available
                  </h3>
                  <p className="text-muted-foreground">
                    No events found matching your criteria
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedEvents.size === filteredEvents.length &&
                          filteredEvents.length > 0
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEvents(
                              new Set(filteredEvents.map((e) => e.id))
                            );
                          } else {
                            setSelectedEvents(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Car</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEvents.has(event.id)}
                          onCheckedChange={() => toggleEventSelection(event.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{event.title}</div>
                          {event.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {event.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEventTypeIcon(event.type)}
                          <span className="text-sm">
                            {formatEventType(event.type)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(event.start)}
                      </TableCell>
                      <TableCell>
                        {event.car ? (
                          <div className="text-sm">
                            {event.car.year} {event.car.make} {event.car.model}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No car
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t border-[hsl(var(--border-subtle))]">
          <div className="text-sm text-muted-foreground">
            {selectedEvents.size} event{selectedEvents.size !== 1 ? "s" : ""}{" "}
            selected
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAttachSelected}
              size="sm"
              disabled={selectedEvents.size === 0}
            >
              Attach Selected ({selectedEvents.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
