"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { Event, EventStatus, EventType } from "@/types/event";
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
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

interface EventsCalendarProps {
  events: Event[];
  onUpdateEvent: (eventId: string, updates: Partial<Event>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Event;
  allDay: boolean;
}

interface EditingEvent extends Event {
  tempDescription?: string;
  tempStart?: string;
  tempEnd?: string;
  tempAssignee?: string;
  tempType?: EventType;
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

export default function EventsCalendar({
  events,
  onUpdateEvent,
  onDeleteEvent,
}: EventsCalendarProps) {
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EditingEvent | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const formatEventType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const calendarEvents = useMemo(() => {
    return events.map((event) => ({
      id: event.id,
      title: formatEventType(event.type),
      start: new Date(event.start),
      end: event.end ? new Date(event.end) : new Date(event.start),
      resource: event,
      allDay: event.isAllDay || view === "month",
    }));
  }, [events, view]);

  const getEventStyle = (event: Event) => {
    const baseStyle = {
      className: cn(
        "rounded-md border px-2 py-1 text-sm font-medium shadow-sm transition-colors",
        "hover:opacity-90"
      ),
      style: {
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        color: "#374151",
        height: "auto",
        minHeight: "2.5rem",
      },
    };

    switch (event.status) {
      case EventStatus.NOT_STARTED:
        return {
          ...baseStyle,
          style: {
            ...baseStyle.style,
            backgroundColor: "#f3f4f6",
            borderColor: "#d1d5db",
            color: "#374151",
          },
        };
      case EventStatus.IN_PROGRESS:
        return {
          ...baseStyle,
          style: {
            ...baseStyle.style,
            backgroundColor: "#dbeafe",
            borderColor: "#93c5fd",
            color: "#1e40af",
          },
        };
      case EventStatus.COMPLETED:
        return {
          ...baseStyle,
          style: {
            ...baseStyle.style,
            backgroundColor: "#dcfce7",
            borderColor: "#86efac",
            color: "#166534",
          },
        };
      default:
        return baseStyle;
    }
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
        isToday && "today-cell bg-zinc-50 dark:bg-zinc-900"
      ),
    };
  };

  const components = {
    event: ({ event }: any) => (
      <EventTooltip event={event.resource}>
        <div className="h-full w-full">
          <div className="line-clamp-2 text-sm font-medium">
            {formatEventType(event.resource.type)}
          </div>
        </div>
      </EventTooltip>
    ),
    toolbar: (toolbarProps: any) => {
      return (
        <div className="rbc-toolbar">
          <span className="rbc-btn-group">
            <button
              type="button"
              onClick={() => toolbarProps.onNavigate("PREV")}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => toolbarProps.onNavigate("TODAY")}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => toolbarProps.onNavigate("NEXT")}
            >
              Next
            </button>
          </span>
          <span className="rbc-toolbar-label">{toolbarProps.label}</span>
          <div className="flex items-center gap-2">
            <span className="rbc-btn-group">
              {toolbarProps.views.map((name: string) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toolbarProps.onView(name)}
                  className={cn(toolbarProps.view === name && "rbc-active")}
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

  const handleEventDrop = async ({ event, start, end }: any) => {
    try {
      const updates = {
        start: format(start, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
        end: format(end || start, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
      };
      await onUpdateEvent(event.id, updates);
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const handleEventResize = async ({ event, start, end }: any) => {
    try {
      const updates = {
        start: format(start, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
        end: format(end, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
      };
      await onUpdateEvent(event.id, updates);
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent({
      ...event.resource,
      tempDescription: event.resource.description,
      tempStart: event.resource.start,
      tempEnd: event.resource.end,
      tempAssignee: event.resource.assignee,
      tempType: event.resource.type,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedEvent) return;

    try {
      const updates: Partial<Event> = {};
      if (selectedEvent.tempDescription !== selectedEvent.description) {
        updates.description = selectedEvent.tempDescription;
      }
      if (selectedEvent.tempStart !== selectedEvent.start) {
        updates.start = selectedEvent.tempStart;
      }
      if (selectedEvent.tempEnd !== selectedEvent.end) {
        updates.end = selectedEvent.tempEnd;
      }
      if (selectedEvent.tempAssignee !== selectedEvent.assignee) {
        updates.assignee = selectedEvent.tempAssignee;
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

  return (
    <>
      <div
        ref={calendarRef}
        className={cn(
          "relative w-full",
          isFullscreen ? "h-screen" : "h-[700px]",
          "bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg p-4"
        )}
      >
        <DragAndDropCalendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor={(event: any) => event.start}
          endAccessor={(event: any) => event.end}
          eventPropGetter={getEventStyle}
          dayPropGetter={dayPropGetter}
          views={["month", "week", "day"]}
          view={view}
          date={date}
          onView={(newView: View) => setView(newView)}
          onNavigate={(newDate: Date) => setDate(newDate)}
          min={new Date(0, 0, 0, 8, 0, 0)}
          max={new Date(0, 0, 0, 20, 0, 0)}
          components={components}
          className={cn(
            "events-calendar",
            isFullscreen && "fullscreen-calendar",
            "dark:dark"
          )}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          onSelectEvent={handleSelectEvent}
          resizable
          draggableAccessor={() => true}
          popup={true}
          selectable={true}
          resizableAccessor={() => true}
          step={30}
          timeslots={2}
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
                  value={selectedEvent.tempType}
                  onValueChange={(value) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      tempType: value as EventType,
                    })
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
                <Label>Assignee</Label>
                <Input
                  value={selectedEvent.tempAssignee}
                  onChange={(e) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      tempAssignee: e.target.value,
                    })
                  }
                  placeholder="Enter assignee"
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
