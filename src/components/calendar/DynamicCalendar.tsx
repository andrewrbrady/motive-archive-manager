"use client";

import { useRef, useEffect } from "react";
import FullCalendarLib from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { FullCalendarEvent } from "./FullCalendar";

interface DynamicCalendarProps {
  events: FullCalendarEvent[];
  onEventDrop: (info: any) => void;
  onEventResize: (info: any) => void;
  onEventClick: (info: any) => void;
}

export default function DynamicCalendar({
  events,
  onEventDrop,
  onEventResize,
  onEventClick,
}: DynamicCalendarProps) {
  const calendarRef = useRef<any>(null);

  // Safe cleanup for the calendar
  useEffect(() => {
    return () => {
      try {
        if (calendarRef.current?.getApi) {
          const api = calendarRef.current.getApi();
          if (api && typeof api.destroy === "function") {
            api.destroy();
          }
        }
      } catch (error) {
        console.warn("Error cleaning up FullCalendar:", error);
      }
    };
  }, []);

  return (
    <FullCalendarLib
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
      }}
      events={events}
      editable={true}
      selectable={true}
      eventDrop={onEventDrop}
      eventResize={onEventResize}
      eventClick={onEventClick}
      height="100%"
      // Simple configuration for all-day events
      allDaySlot={true}
      allDayText="All-day Events"
      dayMaxEventRows={false}
      ref={calendarRef}
    />
  );
}
