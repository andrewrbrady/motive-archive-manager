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
import { Pencil, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface ListViewProps {
  events: Event[];
  onUpdateEvent: (eventId: string, updates: Partial<Event>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

interface EditingEvent extends Event {
  isEditing?: boolean;
  tempDescription?: string;
  tempStart?: string;
  tempEnd?: string;
  tempAssignee?: string;
  tempType?: EventType;
}

export default function ListView({
  events,
  onUpdateEvent,
  onDeleteEvent,
}: ListViewProps) {
  const [editingEvents, setEditingEvents] = useState<EditingEvent[]>(events);

  const formatEventType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "PPp");
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

  const startEditing = (eventId: string) => {
    setEditingEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              isEditing: true,
              tempDescription: event.description,
              tempStart: event.start,
              tempEnd: event.end,
              tempAssignee: event.assignee,
              tempType: event.type,
            }
          : event
      )
    );
  };

  const cancelEditing = (eventId: string) => {
    setEditingEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              isEditing: false,
              tempDescription: undefined,
              tempStart: undefined,
              tempEnd: undefined,
              tempAssignee: undefined,
              tempType: undefined,
            }
          : event
      )
    );
  };

  const saveEditing = async (eventId: string) => {
    const event = editingEvents.find((e) => e.id === eventId);
    if (!event) return;

    try {
      const updates: Partial<Event> = {};
      if (
        event.tempDescription !== undefined &&
        event.tempDescription !== event.description
      ) {
        updates.description = event.tempDescription;
      }
      if (event.tempStart !== undefined && event.tempStart !== event.start) {
        updates.start = event.tempStart;
      }
      if (event.tempEnd !== undefined && event.tempEnd !== event.end) {
        updates.end = event.tempEnd;
      }
      if (
        event.tempAssignee !== undefined &&
        event.tempAssignee !== event.assignee
      ) {
        updates.assignee = event.tempAssignee;
      }
      if (event.tempType !== undefined && event.tempType !== event.type) {
        updates.type = event.tempType;
      }

      if (Object.keys(updates).length > 0) {
        await onUpdateEvent(eventId, updates);
        toast.success("Event updated successfully");
      }

      setEditingEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                ...updates,
                isEditing: false,
                tempDescription: undefined,
                tempStart: undefined,
                tempEnd: undefined,
                tempAssignee: undefined,
                tempType: undefined,
              }
            : e
        )
      );
    } catch (error) {
      toast.error("Failed to update event");
    }
  };

  const updateTempField = (eventId: string, field: string, value: any) => {
    setEditingEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              [field]: value,
            }
          : event
      )
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>End Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {editingEvents.map((event) => (
          <TableRow key={event.id}>
            <TableCell>
              {event.isEditing ? (
                <Select
                  value={event.tempType}
                  onValueChange={(value) =>
                    updateTempField(event.id, "tempType", value)
                  }
                >
                  <SelectTrigger>
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
              {event.isEditing ? (
                <Input
                  value={event.tempDescription}
                  onChange={(e) =>
                    updateTempField(event.id, "tempDescription", e.target.value)
                  }
                />
              ) : (
                event.description
              )}
            </TableCell>
            <TableCell>
              {event.isEditing ? (
                <Input
                  type="datetime-local"
                  value={event.tempStart?.slice(0, 16)}
                  onChange={(e) =>
                    updateTempField(event.id, "tempStart", e.target.value)
                  }
                />
              ) : (
                formatDate(event.start)
              )}
            </TableCell>
            <TableCell>
              {event.isEditing ? (
                <Input
                  type="datetime-local"
                  value={event.tempEnd?.slice(0, 16)}
                  onChange={(e) =>
                    updateTempField(event.id, "tempEnd", e.target.value)
                  }
                />
              ) : (
                formatDate(event.end)
              )}
            </TableCell>
            <TableCell>
              <Select
                value={event.status}
                onValueChange={(value) =>
                  onUpdateEvent(event.id, {
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
                      {status
                        .split("_")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              {event.isEditing ? (
                <Input
                  value={event.tempAssignee}
                  onChange={(e) =>
                    updateTempField(event.id, "tempAssignee", e.target.value)
                  }
                  placeholder="Enter assignee"
                />
              ) : (
                event.assignee || "Unassigned"
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                {event.isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => saveEditing(event.id)}
                      className="text-green-500 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/20"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => cancelEditing(event.id)}
                      className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEditing(event.id)}
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(event.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
