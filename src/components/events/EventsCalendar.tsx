"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { Event as ApiEvent, EventStatus, EventType } from "@/types/event";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2 } from "lucide-react";
import EventTooltip from "./EventTooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./calendar.css";
import { MultiSelect } from "@/components/ui/multi-select";

interface SelectOption {
  label: string;
  value: string;
}

interface EditingEvent extends ApiEvent {
  tempDescription?: string;
  tempStart?: string;
  tempEnd?: string;
  tempAssignees?: SelectOption[];
  tempType?: EventType;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ApiEvent;
  allDay: boolean;
}

interface EventsCalendarProps {
  events: ApiEvent[];
  onUpdateEvent: (eventId: string, updates: Partial<ApiEvent>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  selectedEventTypes?: SelectOption[];
  onEventTypesChange?: (types: SelectOption[]) => void;
  isEditMode?: boolean;
}

interface User {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  creativeRoles: string[];
  status: string;
}

type stringOrDate = string | Date;

interface EventInteractionArgs<TEvent> {
  event: TEvent;
  start: stringOrDate;
  end?: stringOrDate;
  isAllDay?: boolean;
}

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DragAndDropCalendar = withDragAndDrop(Calendar);

const statusColors = {
  NOT_STARTED: "var(--destructive)",
  IN_PROGRESS: "var(--warning)",
  COMPLETED: "var(--success)",
  CANCELLED: "var(--destructive)",
  PENDING: "var(--info)",
  APPROVED: "var(--success)",
  REJECTED: "var(--destructive)",
  default: "var(--zinc-500)",
};

const typeColors: Record<EventType, string> = {
  [EventType.AUCTION_SUBMISSION]: "var(--destructive)",
  [EventType.AUCTION_LISTING]: "var(--warning)",
  [EventType.AUCTION_END]: "var(--info)",
  [EventType.INSPECTION]: "var(--accent)",
  [EventType.DETAIL]: "var(--secondary)",
  [EventType.PRODUCTION]: "var(--primary)",
  [EventType.POST_PRODUCTION]: "var(--success)",
  [EventType.MARKETING]: "var(--info)",
  [EventType.PICKUP]: "var(--warning)",
  [EventType.DELIVERY]: "var(--info)",
  [EventType.OTHER]: "var(--zinc-500)",
};

export default function EventsCalendar({
  events,
  onUpdateEvent,
  onDeleteEvent,
  selectedEventTypes = [],
  onEventTypesChange,
  isEditMode: parentEditMode,
}: EventsCalendarProps) {
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EditingEvent | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [localEditMode, setLocalEditMode] = useState(false);

  // Use parent's edit mode if provided, otherwise use local state
  const isEditMode =
    parentEditMode !== undefined ? parentEditMode : localEditMode;

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

  const formatEventType = (type: string): string => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const calendarEvents = useMemo(() => {
    return events.map((event) => {
      const startDate = new Date(event.start);
      // For single-date events, set end to end of the same day for display
      const endDate = event.end
        ? new Date(event.end)
        : new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
            23,
            59,
            59
          );

      return {
        id: event.id,
        title: formatEventType(event.type),
        start: startDate,
        end: endDate,
        resource: event,
        allDay: event.isAllDay || view === "month",
      };
    });
  }, [events, view]);

  const getEventColor = (type: EventType): string => {
    return typeColors[type] || typeColors[EventType.OTHER];
  };

  const getEventStyle = (event: object) => {
    const typedEvent = event as ApiEvent;
    return {
      style: {
        backgroundColor:
          typeColors[typedEvent.type] ||
          statusColors[typedEvent.status] ||
          statusColors.default,
        color: "var(--background-primary)",
        border: "none",
        borderRadius: "4px",
        padding: "2px 5px",
        opacity: typedEvent.status === EventStatus.COMPLETED ? 0.5 : 1,
      },
    };
  };

  const dayPropGetter = (date: Date) => {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    return {
      className: cn(
        "transition-colors",
        isToday &&
          "today-cell bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))]"
      ),
    };
  };

  const components = {
    event: ({ event }: any) => (
      <EventTooltip event={event.resource}>
        <div className="h-full w-full">
          <div className="truncate text-xs leading-none">
            {formatEventType(event.resource.type)}
          </div>
        </div>
      </EventTooltip>
    ),
    toolbar: (toolbarProps: any) => {
      return (
        <div className="rbc-toolbar">
          <div className="flex items-center gap-2">
            <span className="rbc-btn-group">
              <button
                type="button"
                onClick={() => toolbarProps.onNavigate("PREV")}
                className="px-3"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => toolbarProps.onNavigate("TODAY")}
                className="px-3"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => toolbarProps.onNavigate("NEXT")}
                className="px-3"
              >
                Next
              </button>
            </span>
          </div>
          <span className="rbc-toolbar-label">{toolbarProps.label}</span>
          <div className="flex items-center gap-2">
            <span className="rbc-btn-group">
              {toolbarProps.views.map((name: string) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toolbarProps.onView(name)}
                  className={cn(
                    "px-3",
                    toolbarProps.view === name && "rbc-active"
                  )}
                >
                  {name}
                </button>
              ))}
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className="flex items-center justify-center px-3 py-1"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-[14px] w-[14px]" />
                ) : (
                  <Maximize2 className="h-[14px] w-[14px]" />
                )}
              </button>
            </span>
          </div>
        </div>
      );
    },
  };

  const handleEventDrop = (args: EventInteractionArgs<object>) => {
    const event = args.event as CalendarEvent;
    const typedEvent = event.resource as ApiEvent;
    const start =
      typeof args.start === "string" ? new Date(args.start) : args.start;
    onUpdateEvent(typedEvent.id, {
      start: start.toISOString(),
    });
  };

  const handleEventResize = (args: EventInteractionArgs<object>) => {
    const event = args.event as CalendarEvent;
    const typedEvent = event.resource as ApiEvent;
    const start =
      typeof args.start === "string" ? new Date(args.start) : args.start;
    const end = args.end
      ? typeof args.end === "string"
        ? new Date(args.end)
        : args.end
      : undefined;
    onUpdateEvent(typedEvent.id, {
      start: start.toISOString(),
      end: end?.toISOString(),
    });
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    const formattedStart = format(event.start, "yyyy-MM-dd'T'HH:mm");
    const formattedEnd = event.resource.end
      ? format(new Date(event.resource.end), "yyyy-MM-dd'T'HH:mm")
      : undefined;

    // Convert string[] to SelectOption[]
    const assignees = (event.resource.teamMemberIds || []).map((memberId) => ({
      label: memberId, // You might want to map this to actual user names
      value: memberId,
    }));

    setSelectedEvent({
      ...event.resource,
      tempDescription: event.resource.description,
      tempStart: formattedStart,
      tempEnd: formattedEnd,
      tempAssignees: assignees,
      tempType: event.resource.type,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedEvent) return;

    try {
      const updates: Partial<ApiEvent> = {};
      if (selectedEvent.tempDescription !== selectedEvent.description) {
        updates.description = selectedEvent.tempDescription;
      }
      if (selectedEvent.tempStart !== selectedEvent.start) {
        updates.start = selectedEvent.tempStart;
      }
      if (selectedEvent.tempEnd !== selectedEvent.end) {
        updates.end = selectedEvent.tempEnd;
      }
      if (selectedEvent.tempAssignees) {
        const newTeamMemberIds = selectedEvent.tempAssignees.map(
          (option) => option.value
        );
        if (
          JSON.stringify(newTeamMemberIds) !==
          JSON.stringify(selectedEvent.teamMemberIds)
        ) {
          updates.teamMemberIds = newTeamMemberIds;
        }
      }
      if (selectedEvent.tempType !== selectedEvent.type) {
        updates.type = selectedEvent.tempType;
      }

      if (Object.keys(updates).length > 0) {
        await onUpdateEvent(selectedEvent.id, updates);
        toast.success("Event updated successfully");
      }

      setIsEditModalOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      toast.error("Failed to update event");
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await onDeleteEvent(selectedEvent.id);
        toast.success("Event deleted successfully");
        setIsEditModalOpen(false);
        setSelectedEvent(null);
      } catch (error) {
        toast.error("Failed to delete event");
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      calendarRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleEventClick = (
    event: object,
    e: React.SyntheticEvent<HTMLElement>
  ) => {
    const calendarEvent = event as CalendarEvent;
    const typedEvent = calendarEvent.resource as ApiEvent;
    setSelectedEvent(typedEvent);
    setIsEditModalOpen(true);
  };

  const selectedTypes = selectedEventTypes;
  const eventTypeOptions = Object.values(EventType).map((type: EventType) => ({
    label: formatEventType(type),
    value: type,
  })) as SelectOption[];

  const getBaseColor = (base: string): string => {
    switch (base) {
      case "primary":
        return "var(--primary)";
      case "secondary":
        return "var(--secondary)";
      case "accent":
        return "var(--accent)";
      default:
        return base;
    }
  };

  return (
    <>
      <div
        ref={calendarRef}
        className={cn(
          "relative h-full w-full overflow-hidden rounded-lg border bg-background",
          isFullscreen && "fixed inset-0 z-50"
        )}
      >
        <DragAndDropCalendar
          localizer={localizer}
          events={calendarEvents}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          min={new Date(0, 0, 0, 8, 0, 0)}
          max={new Date(0, 0, 0, 20, 0, 0)}
          components={components}
          className="h-full w-full"
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          draggableAccessor={() => true}
          resizable
          selectable
          popup
          eventPropGetter={getEventStyle}
          dayPropGetter={dayPropGetter}
          onSelectEvent={handleEventClick}
          views={{
            month: true,
            week: true,
            day: true,
          }}
          formats={{
            agendaDateFormat: "MMM d, yyyy",
            agendaTimeFormat: "h:mm a",
            agendaTimeRangeFormat: ({ start, end }) => {
              if (start.getDate() === end.getDate()) {
                return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
              }
              return `${format(start, "MMM d, h:mm a")} - ${format(
                end,
                "MMM d, h:mm a"
              )}`;
            },
            monthHeaderFormat: "MMMM yyyy",
            dayHeaderFormat: "EEE MMM d",
            dayRangeHeaderFormat: ({ start, end }) => {
              if (start.getMonth() === end.getMonth()) {
                return `${format(start, "MMMM d")} - ${format(end, "d, yyyy")}`;
              }
              return `${format(start, "MMMM d")} - ${format(
                end,
                "MMMM d, yyyy"
              )}`;
            },
          }}
          messages={{
            showMore: (total) => `+${total} more`,
          }}
        />
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <Label>Event Type</Label>
                <Select
                  value={
                    selectedEvent.tempType ||
                    selectedEvent.type ||
                    EventType.OTHER
                  }
                  onValueChange={(value) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      tempType: value as EventType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={selectedEvent.tempDescription}
                  onChange={(e) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      tempDescription: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="datetime-local"
                  value={selectedEvent.tempStart?.slice(0, 16)}
                  onChange={(e) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      tempStart: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="datetime-local"
                  value={selectedEvent.tempEnd?.slice(0, 16)}
                  onChange={(e) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      tempEnd: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Assignees</Label>
                <MultiSelect
                  value={selectedEvent.tempAssignees || []}
                  onChange={(values) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      tempAssignees: values as SelectOption[],
                    })
                  }
                  options={users.map((user) => ({
                    value: user.name,
                    label: user.name,
                  }))}
                  placeholder="Select assignees"
                />
              </div>
              <div className="flex justify-between">
                <Button variant="destructive" onClick={handleDelete}>
                  Delete Event
                </Button>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit}>Save Changes</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
