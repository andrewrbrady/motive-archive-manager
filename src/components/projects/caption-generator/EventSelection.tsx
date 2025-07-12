"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, ChevronDown, ChevronRight, Car } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  // Collapsible props
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export function EventSelection({
  projectEvents,
  selectedEventIds,
  loadingEvents,
  onEventSelection,
  onSelectAllEvents,
  hasMoreEvents = false,
  onLoadMoreEvents,
  isOpen = true,
  onToggle,
}: EventSelectionProps) {
  const renderContent = () => {
    if (loadingEvents && projectEvents.length === 0) {
      return (
        <div className="text-sm text-[hsl(var(--foreground-muted))]">
          Loading events...
        </div>
      );
    }

    if (projectEvents.length === 0) {
      return (
        <div className="text-center py-6 text-[hsl(var(--foreground-muted))]">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium mb-1">No events available</p>
          <p className="text-xs">
            Events will appear here when added to the project
          </p>
        </div>
      );
    }

    return (
      <>
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
                {/* Event Icon or Car Thumbnail */}
                <div className="flex-shrink-0">
                  {event.car?.primaryImageId ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border">
                      <img
                        src={`/api/images/${event.car.primaryImageId}/thumbnail`}
                        alt={`${event.car.year} ${event.car.make} ${event.car.model}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to event icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                      <div className="hidden w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                  )}
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
                  {/* Car information */}
                  {event.car && (
                    <div className="flex items-center gap-2 mt-1">
                      <Car className="w-3 h-3 text-[hsl(var(--foreground-muted))]" />
                      <span className="text-xs text-[hsl(var(--foreground-muted))]">
                        {event.car.year} {event.car.make} {event.car.model}
                      </span>
                    </div>
                  )}
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
      </>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 p-0 h-auto font-medium text-[hsl(var(--foreground))] dark:text-white hover:bg-transparent"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Calendar className="h-4 w-4" />
              Select Events for Caption
              {selectedEventIds.length > 0 && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {selectedEventIds.length}
                </span>
              )}
            </Button>
          </CollapsibleTrigger>
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

        <CollapsibleContent>{renderContent()}</CollapsibleContent>
      </div>
    </Collapsible>
  );
}
