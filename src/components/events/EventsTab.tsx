"use client";

import { useState, useEffect } from "react";
import { Event, EventStatus, EventType } from "@/types/event";
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

interface Option {
  label: string;
  value: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  creativeRoles: string[];
  status: string;
}

interface NewEvent {
  type: EventType;
  description: string;
  start: string;
  end?: string;
  assignees: string[];
  status: EventStatus;
  isAllDay: boolean;
}

export default function EventsTab({ carId }: { carId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [newEvent, setNewEvent] = useState<NewEvent>({
    type: EventType.DETAIL,
    description: "",
    start: "",
    end: "",
    assignees: [],
    status: EventStatus.NOT_STARTED,
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
        assignees: event.assignees || [],
        isAllDay: event.isAllDay || false,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();
        setUsers(data.filter((user: User) => user.status === "active"));
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users");
      }
    };

    fetchUsers();
  }, []);

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
          assignees: newEvent.assignees,
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
        assignees: [],
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
        <DialogContent className="sm:max-w-[425px]">
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
              <Label>Assignees</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {Array.isArray(newEvent.assignees) &&
                    newEvent.assignees.length > 0
                      ? `${newEvent.assignees.length} selected`
                      : "Select assignees"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <ScrollArea className="h-[200px]">
                    <div className="grid grid-cols-2 p-2 gap-2">
                      {users.map((user) => {
                        const isSelected =
                          Array.isArray(newEvent.assignees) &&
                          newEvent.assignees.includes(user.name);
                        return (
                          <button
                            key={user._id}
                            onClick={() => {
                              const currentAssignees = Array.isArray(
                                newEvent.assignees
                              )
                                ? [...newEvent.assignees]
                                : [];
                              if (!isSelected) {
                                setNewEvent({
                                  ...newEvent,
                                  assignees: [...currentAssignees, user.name],
                                });
                              } else {
                                setNewEvent({
                                  ...newEvent,
                                  assignees: currentAssignees.filter(
                                    (name) => name !== user.name
                                  ),
                                });
                              }
                            }}
                            className={`flex items-center rounded-md px-3 py-2 transition-colors text-left ${
                              isSelected
                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                : "hover:bg-accent"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-input"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <span className="text-sm truncate ml-3">
                              {user.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={newEvent.status}
                onValueChange={(value) =>
                  setNewEvent({
                    ...newEvent,
                    status: value as EventStatus,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(EventStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddEvent}>Create Event</Button>
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
