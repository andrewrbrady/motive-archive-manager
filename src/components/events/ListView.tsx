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
import { Event, EventType } from "@/types/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Save, Trash2, X, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import isEqual from "lodash/isEqual";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Calendar, Clock, User, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { EventTypeSelector } from "./EventTypeSelector";
import EditEventDialog from "./EditEventDialog";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

export interface ListViewProps {
  events: Event[];
  onUpdateEvent: (eventId: string, updates: Partial<Event>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onEventUpdated: () => void;
  isEditMode?: boolean;
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
  firebaseUid?: string; // Firebase UID for team member tracking and reporting
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
  isEditMode: parentEditMode,
}: ListViewProps) {
  const { user } = useFirebaseAuth();
  const [localEditMode, setLocalEditMode] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [eventsWithCars, setEventsWithCars] = useState<
    (Event & { car?: Car })[]
  >([]);

  // Use parent's edit mode if provided, otherwise use local state
  const isEditMode =
    parentEditMode !== undefined ? parentEditMode : localEditMode;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!user) {
          console.log("ListView: No user available for fetchUsers");
          setUsers([]);
          setUsersLoading(false);
          return;
        }

        // Get the Firebase ID token
        const token = await user.getIdToken();

        const response = await fetch("/api/projects/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();

        // Handle the response structure from /api/projects/users
        let usersArray = [];
        if (Array.isArray(data)) {
          usersArray = data;
        } else if (data && Array.isArray(data.users)) {
          usersArray = data.users;
        } else if (data && typeof data === "object") {
          console.warn("Unexpected users API response structure:", data);
          usersArray = [];
        } else {
          console.error("Invalid users API response:", data);
          usersArray = [];
        }

        // Transform the data to match the expected User interface
        const transformedUsers = usersArray.map((user: any) => ({
          _id: user.uid || user._id,
          name: user.name,
          email: user.email,
          roles: user.roles || [],
          creativeRoles: user.creativeRoles || [],
          status: user.status || "active",
          firebaseUid: user.uid,
        }));

        setUsers(transformedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users");
        setUsers([]); // Set empty array as fallback
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  useEffect(() => {
    if (events.length > 0) {
      setEventsWithCars(
        events.map((event) => ({
          ...event,
          teamMemberIds: event.teamMemberIds || [],
        }))
      );
    }
  }, [events]);

  useEffect(() => {
    if (eventsWithCars.length === 0) return;

    const fetchCarInfo = async () => {
      // Only fetch car info for events that don't have it yet
      const eventsNeedingCarInfo = eventsWithCars.filter(
        (event) => event.car_id && !event.car
      );

      if (eventsNeedingCarInfo.length === 0) return;

      const updatedEvents = await Promise.all(
        eventsWithCars.map(async (event) => {
          try {
            // Only fetch car info if we don't already have it
            if (event.car || !event.car_id) return event;

            const response = await fetch(`/api/cars/${event.car_id}`);
            if (!response.ok) throw new Error("Failed to fetch car");
            const car = await response.json();
            return {
              ...event,
              car,
            };
          } catch (error) {
            console.error("Error fetching car:", error);
            return event;
          }
        })
      );
      setEventsWithCars(updatedEvents);
    };

    fetchCarInfo();
  }, [eventsWithCars.length]); // Only run when eventsWithCars length changes

  const formatEventType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);

      // Format the date using UTC methods to avoid timezone conversion
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();

      // Create a new date in local timezone with the same year/month/day
      const localDate = new Date(year, month, day);

      const result = format(localDate, "PP");
      return result;
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
      // Save all changes
      Promise.all(
        eventsWithCars.map(async (event) => {
          const originalEvent = events.find((e) => e.id === event.id);
          if (originalEvent && !isEqual(event, originalEvent)) {
            await onUpdateEvent(event.id, event);
          }
        })
      )
        .then(() => {
          toast.success("All changes saved successfully");
          onEventUpdated();
        })
        .catch((error) => {
          console.error("Error saving changes:", error);
          toast.error("Failed to save some changes");
          setEventsWithCars(events);
        });
    }
    setLocalEditMode(!localEditMode);
  };

  const updateEventField = async (
    eventId: string,
    field: keyof Event,
    value: any
  ) => {
    try {
      // Just call the parent's update function - it handles optimistic updates
      await onUpdateEvent(eventId, { [field]: value });
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
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
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
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
            <TableHead>Title</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Car</TableHead>
            <TableHead>Team Members</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventsWithCars.map((event) => (
            <TableRow
              key={event.id}
              className="hover:bg-neutral-800/20 transition-all duration-200"
            >
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
                    value={event.title || ""}
                    onChange={(e) =>
                      updateEventField(event.id, "title", e.target.value)
                    }
                  />
                ) : (
                  event.title
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
                    value={event.url || ""}
                    onChange={(e) =>
                      updateEventField(event.id, "url", e.target.value)
                    }
                  />
                ) : event.url ? (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline truncate block max-w-[200px]"
                  >
                    {event.url}
                  </a>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                {isEditMode ? (
                  <Input
                    type="date"
                    value={
                      event.start
                        ? (() => {
                            const date = new Date(event.start);
                            const year = date.getUTCFullYear();
                            const month = String(
                              date.getUTCMonth() + 1
                            ).padStart(2, "0");
                            const day = String(date.getUTCDate()).padStart(
                              2,
                              "0"
                            );
                            return `${year}-${month}-${day}`;
                          })()
                        : ""
                    }
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
                    value={
                      event.end
                        ? (() => {
                            const date = new Date(event.end);
                            const year = date.getUTCFullYear();
                            const month = String(
                              date.getUTCMonth() + 1
                            ).padStart(2, "0");
                            const day = String(date.getUTCDate()).padStart(
                              2,
                              "0"
                            );
                            return `${year}-${month}-${day}`;
                          })()
                        : ""
                    }
                    onChange={(e) =>
                      updateEventField(event.id, "end", e.target.value)
                    }
                  />
                ) : (
                  formatDate(event.end)
                )}
              </TableCell>
              <TableCell>
                {event.car ? (
                  <div className="text-sm">
                    <div className="font-medium">
                      {event.car.year} {event.car.make} {event.car.model}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">No car</span>
                )}
              </TableCell>
              <TableCell className="min-w-[200px]">
                {isEditMode ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {Array.isArray(event.teamMemberIds) &&
                        event.teamMemberIds.length > 0
                          ? `${event.teamMemberIds.length} selected`
                          : "Select team members"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <ScrollArea className="h-[200px]">
                        <div className="p-2 space-y-1">
                          {users.map((user) => {
                            const userUid = user.firebaseUid || user._id; // Fallback to _id if no firebaseUid
                            const isSelected =
                              Array.isArray(event.teamMemberIds) &&
                              event.teamMemberIds.includes(userUid);
                            return (
                              <button
                                key={user._id}
                                onClick={() => {
                                  const currentTeamMemberIds = Array.isArray(
                                    event.teamMemberIds
                                  )
                                    ? [...event.teamMemberIds]
                                    : [];
                                  if (!isSelected) {
                                    updateEventField(
                                      event.id,
                                      "teamMemberIds",
                                      [...currentTeamMemberIds, userUid]
                                    );
                                  } else {
                                    updateEventField(
                                      event.id,
                                      "teamMemberIds",
                                      currentTeamMemberIds.filter(
                                        (uid) => uid !== userUid
                                      )
                                    );
                                  }
                                }}
                                className={`flex items-center w-full rounded-md px-3 py-2 transition-colors text-left ${
                                  isSelected
                                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                                    : "hover:bg-accent"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors mr-3 flex-shrink-0 ${
                                    isSelected
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-input"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>
                                <span className="text-sm">{user.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(event.teamMemberIds) &&
                    event.teamMemberIds.length > 0 ? (
                      event.teamMemberIds.map((uid) => {
                        // Find user by Firebase UID or fallback to _id
                        const user = users.find(
                          (u) => (u.firebaseUid || u._id) === uid
                        );

                        // If users haven't loaded yet, show loading state
                        if (usersLoading) {
                          return (
                            <Badge
                              key={uid}
                              variant="secondary"
                              className="text-xs py-0.5 px-2 min-w-[60px] animate-pulse bg-muted"
                            >
                              Loading...
                            </Badge>
                          );
                        }

                        // If user not found after loading, show a placeholder
                        const displayName = user ? user.name : "Unknown User";
                        return (
                          <Badge
                            key={uid}
                            variant="secondary"
                            className="text-xs py-0.5 px-2"
                            title={
                              user
                                ? `${user.name} (${user.email})`
                                : `User ID: ${uid}`
                            }
                          >
                            {displayName}
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-muted-foreground">
                        No team members
                      </span>
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {/* Created By column */}
                {(() => {
                  if (!event.createdBy) {
                    return (
                      <span className="text-muted-foreground">Unknown</span>
                    );
                  }

                  // Try to find user by Firebase UID first, then by _id, then by name
                  const creator = users.find(
                    (u) =>
                      u.firebaseUid === event.createdBy ||
                      u._id === event.createdBy ||
                      u.name === event.createdBy
                  );

                  if (creator) {
                    return creator.name;
                  }

                  // If no user found, show the createdBy value (could be a UID or name)
                  return (
                    <span
                      className="text-muted-foreground text-xs"
                      title={event.createdBy}
                    >
                      {event.createdBy.length > 20
                        ? `${event.createdBy.substring(0, 20)}...`
                        : event.createdBy}
                    </span>
                  );
                })()}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingEvent(event);
                      setIsEditModalOpen(true);
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {isEditMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(event.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-muted"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Event Modal */}
      <EditEventDialog
        event={editingEvent}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onUpdate={async (eventId: string, updates: Partial<Event>) => {
          await onUpdateEvent(eventId, updates);
          setIsEditModalOpen(false);
          setEditingEvent(null);
          // onEventUpdated(); // Removed to prevent page reload
        }}
      />
    </div>
  );
}
