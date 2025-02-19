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
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./calendar.css";

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

  const getEventStyle = (event: Event) => {
    let backgroundColor = "#374151"; // Default gray (zinc-700)

    switch (event.status) {
      case EventStatus.NOT_STARTED:
        backgroundColor = "#374151"; // zinc-700
        break;
      case EventStatus.IN_PROGRESS:
        backgroundColor = "#2563eb"; // blue-600
        break;
      case EventStatus.COMPLETED:
        backgroundColor = "#059669"; // emerald-600
        break;
    }

    return {
      style: {
        backgroundColor,
        color: "#ffffff",
        border: "none",
        borderRadius: "4px",
        padding: "2px 4px",
        opacity: 0.9,
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
        isToday && "today-cell bg-zinc-50 dark:bg-zinc-900"
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

  const handleEventDrop = async ({ event, start }: any) => {
    try {
      // Always update the start date
      const updates: Partial<Event> = {
        start: format(start, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
      };

      // Only include end date if the original event actually had one
      if (event.resource.end) {
        // Calculate the new end date by maintaining the same duration
        const originalStart = new Date(event.resource.start);
        const originalEnd = new Date(event.resource.end);
        const duration = originalEnd.getTime() - originalStart.getTime();
        const newEnd = new Date(start.getTime() + duration);
        updates.end = format(newEnd, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
      }

      await onUpdateEvent(event.id, updates);
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const handleEventResize = async ({ event, start, end }: any) => {
    try {
      const updates: Partial<Event> = {
        start: format(start, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
        end: format(end, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"), // Resize always sets an end date
      };
      await onUpdateEvent(event.id, updates);
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    // Format dates to ISO string but trim off milliseconds and timezone
    const formattedStart = format(event.start, "yyyy-MM-dd'T'HH:mm");
    const formattedEnd = event.resource.end
      ? format(new Date(event.resource.end), "yyyy-MM-dd'T'HH:mm")
      : undefined;

    setSelectedEvent({
      ...event.resource,
      tempDescription: event.resource.description,
      tempStart: formattedStart,
      tempEnd: formattedEnd,
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
          "relative w-full mb-8",
          isFullscreen ? "h-screen" : "h-[900px]",
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
          views={{
            month: true,
            week: true,
            day: true,
          }}
          view={view}
          date={date}
          onView={(newView: View) => setView(newView)}
          onNavigate={(newDate: Date) => setDate(newDate)}
          min={new Date(0, 0, 0, 8, 0, 0)}
          max={new Date(0, 0, 0, 20, 0, 0)}
          components={components}
          className={cn(
            "events-calendar h-full",
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
          length={30}
          showMultiDayTimes={true}
          dayLayoutAlgorithm="no-overlap"
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
                    EventType.CUSTOM
                  }
                  onValueChange={(value) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      tempType: value as EventType,
                    })
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(EventType).map((type) => (
                      <SelectItem key={type} value={type || EventType.CUSTOM}>
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
