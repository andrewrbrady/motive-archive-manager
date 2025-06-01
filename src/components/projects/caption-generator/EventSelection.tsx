"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { ProjectEvent } from "./types";

interface EventSelectionProps {
  projectEvents: ProjectEvent[];
  selectedEventIds: string[];
  loadingEvents: boolean;
  onEventSelection: (eventId: string) => void;
  onSelectAllEvents: () => void;
  // Optional load more functionality
  hasMoreEvents?: boolean;
  onLoadMoreEvents?: () => void;
}

export function EventSelection({
  projectEvents,
  selectedEventIds,
  loadingEvents,
  onEventSelection,
  onSelectAllEvents,
  hasMoreEvents = false,
  onLoadMoreEvents,
}: EventSelectionProps) {
  if (loadingEvents && projectEvents.length === 0) {
    return (
      <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
        <div className="text-sm text-[hsl(var(--foreground-muted))]">
          Loading events...
        </div>
      </div>
    );
  }

  if (projectEvents.length === 0) {
    return null; // Don't show anything if no events
  }

  return (
    <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
          Select Events for Caption
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectAllEvents}
          className="border-[hsl(var(--border))]"
        >
          {selectedEventIds.length === projectEvents.length
            ? "Deselect All"
            : "Select All"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {projectEvents.map((event, index) => {
          const isSelected = selectedEventIds.includes(event.id);
          const eventDate = new Date(event.start);
          const isUpcoming = eventDate > new Date();

          return (
            <button
              key={event.id ? `event-${event.id}` : `event-index-${index}`}
              onClick={() => onEventSelection(event.id)}
              className={`flex items-center space-x-3 p-3 border rounded-lg transition-all text-left w-full ${
                isSelected
                  ? "border-blue-500/50"
                  : "border-[hsl(var(--border-subtle))] hover:border-white"
              }`}
            >
              {/* Event Icon */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="flex-1">
                <div className="font-medium text-sm text-[hsl(var(--foreground))] dark:text-white">
                  {event.title}
                </div>
                <div className="text-xs text-[hsl(var(--foreground-muted))]">
                  {event.type} • {eventDate.toLocaleDateString()}
                  {event.description && (
                    <span>
                      {" "}
                      • {event.description.substring(0, 50)}
                      {event.description.length > 50 ? "..." : ""}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                {isUpcoming && (
                  <span className="text-xs text-blue-600 font-medium">
                    Upcoming
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Load More Events Button */}
      {hasMoreEvents && onLoadMoreEvents && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMoreEvents}
            disabled={loadingEvents}
            className="w-full border-[hsl(var(--border))] text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]"
          >
            {loadingEvents ? (
              <>Loading more events...</>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Load More Events
              </>
            )}
          </Button>
        </div>
      )}

      {selectedEventIds.length > 0 && (
        <div className="text-sm text-[hsl(var(--foreground-muted))]">
          {selectedEventIds.length} event
          {selectedEventIds.length !== 1 ? "s" : ""} selected
        </div>
      )}
    </div>
  );
}
