"use client";

import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Event, EventStatus, EventType } from "@/types/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Save, Trash2, X, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";

export interface ListViewProps {
  events: Event[];
  onUpdateEvent: (eventId: string, updates: Partial<Event>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onEventUpdated: () => void;
}

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  creativeRoles: string[];
  status: string;
}

interface EditingEvent extends Event {
  isEditing?: boolean;
  car?: Car | undefined;
}

export default function ListView({
  events,
  onUpdateEvent,
  onDeleteEvent,
  onEventUpdated,
}: ListViewProps) {
  const [editingEvents, setEditingEvents] = useState<EditingEvent[]>(events);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Update useEffect to preserve more state when syncing events
  useEffect(() => {
    setEditingEvents((prevEditingEvents) =>
      events.map((event) => {
        const existingEvent = prevEditingEvents.find((e) => e.id === event.id);
        return {
          ...event,
          car: existingEvent?.car,
          assignees: event.assignees || existingEvent?.assignees || [],
        };
      })
    );
  }, [events]);

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

  useEffect(() => {
    if (events.length === 0) return;

    const fetchCarInfo = async () => {
      const updatedEvents = await Promise.all(
        editingEvents.map(async (event) => {
          try {
            // Only fetch car info if we don't already have it
            if (event.car) return event;

            const carId = event.car_id;
            if (!carId) {
              console.error("No car_id found for event:", event);
              return event;
            }

            const response = await fetch(`/api/cars/${carId}`);
            if (!response.ok) throw new Error("Failed to fetch car");
            const car = await response.json();
            return {
              ...event,
              car,
              assignees: event.assignees || [],
            };
          } catch (error) {
            console.error("Error fetching car:", error);
            return event;
          }
        })
      );
      setEditingEvents(updatedEvents);
    };

    fetchCarInfo();
  }, [events]);

  const formatEventType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "PP");
    } catch (error) {
      console.error("Invalid date:", dateString);
      return "-";
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      if (window.confirm("Are you sure you want to delete this event?")) {
        await onDeleteEvent(eventId);
        toast.success("Event deleted successfully");
      }
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      // When exiting edit mode, save all changes
      editingEvents.forEach(async (editedEvent) => {
        const originalEvent = events.find((e) => e.id === editedEvent.id);
        if (!originalEvent) return;

        const updates: Partial<Event> = {};
        if (editedEvent.description !== originalEvent.description) {
          updates.description = editedEvent.description;
        }
        if (editedEvent.start !== originalEvent.start) {
          updates.start = editedEvent.start;
        }
        if (editedEvent.end !== originalEvent.end) {
          updates.end = editedEvent.end;
        }
        if (editedEvent.type !== originalEvent.type) {
          updates.type = editedEvent.type;
        }

        // Ensure both arrays are properly initialized
        const editedAssignees = Array.isArray(editedEvent.assignees)
          ? editedEvent.assignees
          : [];
        const originalAssignees = Array.isArray(originalEvent.assignees)
          ? originalEvent.assignees
          : [];

        if (
          JSON.stringify(editedAssignees) !== JSON.stringify(originalAssignees)
        ) {
          updates.assignees = editedAssignees;
        }

        console.log("Saving updates for event:", editedEvent.id, updates);
        if (Object.keys(updates).length > 0) {
          try {
            await onUpdateEvent(editedEvent.id, updates);
            console.log("Successfully updated event:", editedEvent.id);
          } catch (error) {
            console.error("Error updating event:", error);
          }
        }
      });
      // Reset to original events
      setEditingEvents(events);
    }
    setIsEditMode(!isEditMode);
  };

  const updateEventField = async (
    eventId: string,
    field: keyof Event,
    value: any
  ) => {
    try {
      // Optimistically update the UI
      setEditingEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === eventId
            ? {
                ...event,
                [field]: field === "assignees" ? [...value] : value,
              }
            : event
        )
      );

      // Call the update function
      await onUpdateEvent(eventId, { [field]: value });
    } catch (error) {
      console.error("Error updating event:", error);
      // If there's an error, revert the optimistic update
      setEditingEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === eventId
            ? {
                ...event,
                [field]: events.find((e) => e.id === eventId)?.[field],
              }
            : event
        )
      );
      toast.error("Failed to update event");
    }
  };

  const handleStatusChange = async (event: Event, newStatus: EventStatus) => {
    try {
      const response = await fetch(
        `/api/cars/${event.car_id}/events/${event.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...event, status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update event status");
      }

      toast.success("Event status updated successfully");
      onEventUpdated();
    } catch (error) {
      console.error("Error updating event status:", error);
      toast.error("Failed to update event status");
    }
  };

  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode);
    setSelectedEvents([]);
  };

  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  const toggleAllEvents = () => {
    if (selectedEvents.length === events.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(events.map((event) => event.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedEvents.length === 0) {
      toast.error("No events selected");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedEvents.length} events?`
      )
    ) {
      return;
    }

    try {
      // Delete all selected events
      await Promise.all(
        selectedEvents.map((eventId) => onDeleteEvent(eventId))
      );

      toast.success(`Successfully deleted ${selectedEvents.length} events`);
      setSelectedEvents([]);
      onEventUpdated();
    } catch (error) {
      console.error("Error deleting events:", error);
      toast.error("Failed to delete some events");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={isBatchMode ? "default" : "outline"}
            onClick={toggleBatchMode}
          >
            {isBatchMode ? "Exit Batch Mode" : "Batch Delete"}
          </Button>
          {isBatchMode && (
            <>
              <Button variant="outline" onClick={toggleAllEvents}>
                {selectedEvents.length === events.length ? (
                  <CheckSquare className="w-4 h-4 mr-2" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                Select All
              </Button>
              <Button
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={selectedEvents.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedEvents.length})
              </Button>
            </>
          )}
        </div>
        <Button
          variant={isEditMode ? "default" : "outline"}
          onClick={toggleEditMode}
          className="ml-2"
        >
          {isEditMode ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save All
            </>
          ) : (
            <>
              <Pencil className="w-4 h-4 mr-2" />
              Edit All
            </>
          )}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {isBatchMode && (
              <TableHead className="w-[50px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllEvents}
                  className="p-0"
                >
                  {selectedEvents.length === events.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </TableHead>
            )}
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assignees</TableHead>
            {isEditMode && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {editingEvents.map((event) => (
            <TableRow key={event.id}>
              {isBatchMode && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleEventSelection(event.id)}
                    className="p-0"
                  >
                    {selectedEvents.includes(event.id) ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              )}
              <TableCell>
                {isEditMode ? (
                  <Select
                    value={event.type}
                    onValueChange={(value) =>
                      updateEventField(event.id, "type", value)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(EventType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatEventType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  formatEventType(event.type)
                )}
              </TableCell>
              <TableCell>
                {isEditMode ? (
                  <Input
                    value={event.description || ""}
                    onChange={(e) =>
                      updateEventField(event.id, "description", e.target.value)
                    }
                  />
                ) : (
                  event.description
                )}
              </TableCell>
              <TableCell>
                {isEditMode ? (
                  <Input
                    type="date"
                    value={event.start?.split("T")[0] || ""}
                    onChange={(e) =>
                      updateEventField(event.id, "start", e.target.value)
                    }
                  />
                ) : (
                  formatDate(event.start)
                )}
              </TableCell>
              <TableCell>
                {isEditMode ? (
                  <Input
                    type="date"
                    value={event.end?.split("T")[0] || ""}
                    onChange={(e) =>
                      updateEventField(event.id, "end", e.target.value)
                    }
                  />
                ) : (
                  formatDate(event.end)
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    event.status === EventStatus.COMPLETED
                      ? "default"
                      : event.status === EventStatus.IN_PROGRESS
                      ? "secondary"
                      : "outline"
                  }
                >
                  {event.status}
                </Badge>
              </TableCell>
              <TableCell className="min-w-[200px]">
                {isEditMode ? (
                  <div className="relative">
                    <MultiSelect
                      value={event.assignees || []}
                      onChange={(values) => {
                        updateEventField(event.id, "assignees", values);
                      }}
                      options={users.map((user) => ({
                        value: user.name,
                        label: user.name,
                      }))}
                      placeholder="Select assignees"
                      className="z-[9999]"
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      }}
                    />
                  </div>
                ) : event.assignees?.length > 0 ? (
                  event.assignees.join(", ")
                ) : (
                  "Unassigned"
                )}
              </TableCell>
              {isEditMode && (
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(event.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {event.status !== EventStatus.COMPLETED && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleStatusChange(
                            event,
                            event.status === EventStatus.NOT_STARTED
                              ? EventStatus.IN_PROGRESS
                              : EventStatus.COMPLETED
                          )
                        }
                      >
                        {event.status === EventStatus.NOT_STARTED
                          ? "Start"
                          : "Complete"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
