import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingContainer } from "@/components/ui/loading";
import { Calendar, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import type { EventDetails } from "./types";

interface EventSelectionProps {
  events: EventDetails[];
  selectedEventIds: string[];
  onEventSelection: (eventIds: string[]) => void;
  onSelectAll: () => void;
  loading: boolean;
}

export function EventSelection({
  events,
  selectedEventIds,
  onEventSelection,
  onSelectAll,
  loading,
}: EventSelectionProps) {
  const handleEventToggle = (eventId: string, checked: boolean) => {
    if (checked) {
      onEventSelection([...selectedEventIds, eventId]);
    } else {
      onEventSelection(selectedEventIds.filter((id) => id !== eventId));
    }
  };

  const allSelected =
    events.length > 0 && selectedEventIds.length === events.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Events ({selectedEventIds.length}/{events.length})
          </CardTitle>
          {events.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              className="flex items-center gap-2"
            >
              <CheckSquare className="w-3 h-3" />
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingContainer />
        ) : events.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No events available</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`event-${event.id}`}
                  checked={selectedEventIds.includes(event.id)}
                  onCheckedChange={(checked) =>
                    handleEventToggle(event.id, checked as boolean)
                  }
                />
                <label
                  htmlFor={`event-${event.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {event.type} •{" "}
                    {format(new Date(event.start), "MMM d, yyyy")}
                  </div>
                  {event.description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {event.description}
                    </div>
                  )}
                </label>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
