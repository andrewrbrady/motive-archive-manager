"use client";

import { useRef, useEffect, useState } from "react";
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
  filterControls?: React.ReactNode;
  onFiltersClick?: () => void;
  // Filter state props
  showEvents?: boolean;
  showDeliverables?: boolean;
  onToggleEvents?: (show: boolean) => void;
  onToggleDeliverables?: (show: boolean) => void;
  // Filter options
  filterOptions?: React.ReactNode;
}

export default function DynamicCalendar({
  events,
  onEventDrop,
  onEventResize,
  onEventClick,
  filterControls,
  onFiltersClick,
  showEvents,
  showDeliverables,
  onToggleEvents,
  onToggleDeliverables,
  filterOptions,
}: DynamicCalendarProps) {
  const calendarRef = useRef<any>(null);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

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

  // Custom buttons configuration
  const customButtons = {
    separator: {
      text: "|",
      click: function () {
        // Do nothing - this is just a visual separator
      },
    },
    filtersButton: {
      text: "🔽 Filters",
      click: function () {
        setShowFiltersDropdown((prev) => !prev);
        if (onFiltersClick) {
          onFiltersClick();
        }
      },
    },
  };

  return (
    <div className="w-full h-full relative">
      <FullCalendarLib
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right:
            "dayGridMonth,timeGridWeek,timeGridDay,listWeek separator filtersButton",
        }}
        customButtons={customButtons}
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

      {/* Render filter dropdowns when needed */}
      {showFiltersDropdown && (
        <div className="absolute top-16 right-8 z-50 bg-background border border-border rounded-md shadow-lg p-4 min-w-56 max-h-96 overflow-y-auto">
          <div className="text-sm font-medium mb-3">Filters</div>

          {/* Visibility Controls */}
          <div className="mb-4 pb-4 border-b border-border">
            <div className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">
              Show/Hide
            </div>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEvents}
                  onChange={(e) => onToggleEvents?.(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Events</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDeliverables}
                  onChange={(e) => onToggleDeliverables?.(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Deliverables</span>
              </label>
            </div>
          </div>

          {/* Filter Options */}
          {filterOptions || (
            <div className="text-sm text-muted-foreground">
              No filter options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
