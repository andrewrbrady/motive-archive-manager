"use client";

import { useState } from "react";
import { Event } from "@/types/event";
import { Deliverable } from "@/types/deliverable";
import { toast } from "sonner";
import { MotiveCalendar } from "@/components/calendar";
import { Loader2 } from "lucide-react";
import { LoadingContainer } from "@/components/ui/loading";
import { useAPIQuery } from "@/hooks/useAPIQuery";

interface CalendarTabProps {
  carId: string;
}

/**
 * CalendarTab - Phase 2 optimized calendar component
 * Converted from blocking useEffect pattern to non-blocking useAPIQuery pattern
 * Following successful Phase 1 and 2 optimization patterns
 */
export default function CalendarTab({ carId }: CalendarTabProps) {
  // Phase 2 optimization: Use non-blocking useAPIQuery instead of blocking useEffect + Promise.all
  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    error: eventsError,
    refetch: refetchEvents,
  } = useAPIQuery<Event[]>(`cars/${carId}/events?limit=500`, {
    staleTime: 3 * 60 * 1000, // 3 minutes cache for events data
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    // Handle API response variations
    select: (data: any) => {
      return Array.isArray(data) ? data : [];
    },
  });

  const {
    data: deliverablesData,
    isLoading: isLoadingDeliverables,
    error: deliverablesError,
    refetch: refetchDeliverables,
  } = useAPIQuery<Deliverable[]>(`cars/${carId}/deliverables`, {
    staleTime: 3 * 60 * 1000, // 3 minutes cache for deliverables data
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    // Handle API response variations
    select: (data: any) => {
      return Array.isArray(data) ? data : [];
    },
  });

  // Process data safely
  const events = eventsData || [];
  const deliverables = deliverablesData || [];

  // Combined loading state
  const isLoading = isLoadingEvents || isLoadingDeliverables;

  // Non-blocking error handling
  if (eventsError) {
    console.error("Error fetching calendar events:", eventsError);
  }
  if (deliverablesError) {
    console.error("Error fetching calendar deliverables:", deliverablesError);
  }

  const handleEventDrop = async (args: any) => {
    // After the MotiveCalendar component handles the event drop, refresh the data
    try {
      await Promise.all([refetchEvents(), refetchDeliverables()]);
    } catch (error) {
      console.error("Error refreshing calendar data:", error);
    }
  };

  const handleEventResize = async (args: any) => {
    // After the MotiveCalendar component handles the event resize, refresh the data
    try {
      await Promise.all([refetchEvents(), refetchDeliverables()]);
    } catch (error) {
      console.error("Error refreshing calendar data:", error);
    }
  };

  const handleSelectEvent = (event: any) => {
    // Implementation for event selection
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Event selected:", event);
  };

  // Phase 2 improvement: Non-blocking loading state with tab switching message
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-muted/30 border border-muted rounded-md p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Loading calendar data...
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            You can switch tabs while this loads
          </p>
        </div>
        <LoadingContainer />
      </div>
    );
  }

  // Non-blocking error display
  if (eventsError || deliverablesError) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/15 border border-destructive/20 rounded-md p-3">
          <p className="text-destructive text-sm">
            Failed to load calendar data. Tab switching is still available.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => refetchEvents()}
              className="text-xs underline text-destructive hover:no-underline"
            >
              Retry Events
            </button>
            <button
              onClick={() => refetchDeliverables()}
              className="text-xs underline text-destructive hover:no-underline"
            >
              Retry Deliverables
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MotiveCalendar
        carId={carId}
        events={events}
        deliverables={deliverables}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        className="flex-1"
        style={{
          minHeight: "700px",
          height: "calc(100vh - 220px)",
          border: "none",
          overflow: "hidden",
        }}
      />
    </div>
  );
}
