"use client";

import { useState, useEffect } from "react";
import { Event, EventType, EventStatus } from "@/types/event";
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
  CircleDot,
  Play,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectEventsTabProps {
  projectId: string;
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

// Icon mapping for event statuses
const getEventStatusIcon = (status: EventStatus) => {
  switch (status) {
    case EventStatus.NOT_STARTED:
      return <CircleDot className="w-4 h-4 flex-shrink-0" />;
    case EventStatus.IN_PROGRESS:
      return <Play className="w-4 h-4 flex-shrink-0" />;
    case EventStatus.COMPLETED:
      return <CheckCircle className="w-4 h-4 flex-shrink-0" />;
    default:
      return <CircleDot className="w-4 h-4 flex-shrink-0" />;
  }
};

export default function ProjectEventsTab({ projectId }: ProjectEventsTabProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/events`);

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
    if (projectId) {
      fetchEvents();
    }
  }, [projectId]);

  const handleCreateEvent = async (eventData: Partial<Event>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error("Failed to create event");
      }

      await fetchEvents();
      toast.success("Event created successfully");
      setShowCreateEvent(false);
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    }
  };

  const handleUpdateEvent = async (
    eventId: string,
    updates: Partial<Event>
  ) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/events/${eventId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

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
      const response = await fetch(
        `/api/projects/${projectId}/events/${eventId}`,
        {
          method: "DELETE",
        }
      );

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

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case EventStatus.NOT_STARTED:
        return "bg-gray-100 text-gray-800";
      case EventStatus.IN_PROGRESS:
        return "bg-blue-100 text-blue-800";
      case EventStatus.COMPLETED:
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: EventType) => {
    switch (type) {
      case EventType.PRODUCTION:
        return "bg-purple-100 text-purple-800";
      case EventType.POST_PRODUCTION:
        return "bg-indigo-100 text-indigo-800";
      case EventType.MARKETING:
        return "bg-pink-100 text-pink-800";
      case EventType.INSPECTION:
        return "bg-yellow-100 text-yellow-800";
      case EventType.DETAIL:
        return "bg-cyan-100 text-cyan-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Project Events</h3>
        <Button
          onClick={() => setShowCreateEvent(true)}
          className="border-[hsl(var(--border))]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="pt-4">
            <div className="text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No events scheduled for this project</p>
              <Button
                variant="outline"
                className="mt-4 border-[hsl(var(--border))]"
                onClick={() => setShowCreateEvent(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Event
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {event.description || "Untitled Event"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(event.type)}>
                      {event.type.replace(/_/g, " ")}
                    </Badge>
                    <Badge className={getStatusColor(event.status)}>
                      {event.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(new Date(event.start), "MMM d, yyyy 'at' h:mm a")}
                      {event.end &&
                        ` - ${format(new Date(event.end), "h:mm a")}`}
                    </span>
                  </div>
                  {event.teamMemberIds.length > 0 && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{event.teamMemberIds.length} team member(s)</span>
                    </div>
                  )}
                </div>
                {event.car_id && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Associated with car: {event.car_id}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateEventDialog
        open={showCreateEvent}
        onOpenChange={setShowCreateEvent}
        onCreate={handleCreateEvent}
      />
    </div>
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
    description: "",
    start: "",
    end: "",
    status: EventStatus.NOT_STARTED,
    isAllDay: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }

    if (!formData.start) {
      toast.error("Start date is required");
      return;
    }

    try {
      await onCreate({
        ...formData,
        teamMemberIds: [], // Start with empty team
      });

      // Reset form after successful creation
      setFormData({
        type: EventType.PRODUCTION,
        description: "",
        start: "",
        end: "",
        status: EventStatus.NOT_STARTED,
        isAllDay: false,
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
      description: "",
      start: "",
      end: "",
      status: EventStatus.NOT_STARTED,
      isAllDay: false,
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
                  htmlFor="description"
                  className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                >
                  Description
                </Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Event description"
                  required
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
                    Start Date & Time
                  </Label>
                  <Input
                    id="start"
                    type="datetime-local"
                    value={formData.start}
                    onChange={(e) =>
                      setFormData({ ...formData, start: e.target.value })
                    }
                    required
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="end"
                    className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide"
                  >
                    End Date & Time
                  </Label>
                  <Input
                    id="end"
                    type="datetime-local"
                    value={formData.end}
                    onChange={(e) =>
                      setFormData({ ...formData, end: e.target.value })
                    }
                    className="text-sm"
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

            {/* Type and Status Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                  Type and Status
                </span>
                <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Event Type
                  </Label>
                  <CustomDropdown
                    value={formData.type}
                    onChange={(value) =>
                      setFormData({ ...formData, type: value as EventType })
                    }
                    options={[
                      {
                        value: EventType.PRODUCTION,
                        label: "Production",
                        icon: <Camera className="w-4 h-4 flex-shrink-0" />,
                      },
                      {
                        value: EventType.POST_PRODUCTION,
                        label: "Post-Production",
                        icon: <Video className="w-4 h-4 flex-shrink-0" />,
                      },
                      {
                        value: EventType.MARKETING,
                        label: "Marketing",
                        icon: <Sparkles className="w-4 h-4 flex-shrink-0" />,
                      },
                      {
                        value: EventType.INSPECTION,
                        label: "Inspection",
                        icon: <Search className="w-4 h-4 flex-shrink-0" />,
                      },
                      {
                        value: EventType.DETAIL,
                        label: "Detail",
                        icon: <Wrench className="w-4 h-4 flex-shrink-0" />,
                      },
                      {
                        value: EventType.PICKUP,
                        label: "Pickup",
                        icon: <Package className="w-4 h-4 flex-shrink-0" />,
                      },
                      {
                        value: EventType.DELIVERY,
                        label: "Delivery",
                        icon: <Truck className="w-4 h-4 flex-shrink-0" />,
                      },
                    ]}
                    placeholder="Select type"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Status
                  </Label>
                  <CustomDropdown
                    value={formData.status}
                    onChange={(value) =>
                      setFormData({ ...formData, status: value as EventStatus })
                    }
                    options={[
                      {
                        value: EventStatus.NOT_STARTED,
                        label: "Not Started",
                        icon: <CircleDot className="w-4 h-4 flex-shrink-0" />,
                      },
                      {
                        value: EventStatus.IN_PROGRESS,
                        label: "In Progress",
                        icon: <Play className="w-4 h-4 flex-shrink-0" />,
                      },
                      {
                        value: EventStatus.COMPLETED,
                        label: "Completed",
                        icon: <CheckCircle className="w-4 h-4 flex-shrink-0" />,
                      },
                    ]}
                    placeholder="Select status"
                  />
                </div>
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
