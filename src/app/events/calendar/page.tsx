"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MotiveCalendar } from "@/components/calendar";
import { Button } from "@/components/ui/button";
import { LoadingContainer } from "@/components/ui/loading";
import { PageTitle } from "@/components/ui/PageTitle";
import { useAPI } from "@/hooks/useAPI";
import { Event } from "@/types/event";

interface EventsApiResponse {
  events?: Event[];
  pagination?: {
    currentPage?: number;
    totalPages?: number;
    totalCount?: number;
    pageSize?: number;
  };
}

const PAGE_SIZE = 100;
const MAX_PAGES = 30; // Safety guard to avoid runaway pagination (3,000 events)

export default function EventsCalendarPage() {
  const api = useAPI();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const fetchEventsPage = useCallback(
    async (page: number) => {
      if (!api) {
        throw new Error("Authentication required");
      }

      const searchParams = new URLSearchParams();
      searchParams.set("page", page.toString());
      searchParams.set("pageSize", PAGE_SIZE.toString());

      const response = (await api.get(
        `events?${searchParams.toString()}`
      )) as EventsApiResponse | Event[];

      if (Array.isArray(response)) {
        return {
          events: response,
          pagination: undefined,
        };
      }

      return {
        events: response.events ?? [],
        pagination: response.pagination,
      };
    },
    [api]
  );

  const fetchAllEvents = useCallback(async () => {
    if (!api) return;

    setIsLoading(true);
    setError(null);
    setIsTruncated(false);

    try {
      const aggregated: Event[] = [];

      const firstPage = await fetchEventsPage(1);
      const totalPages = firstPage.pagination?.totalPages ?? 1;

      const startPage =
        totalPages > MAX_PAGES ? totalPages - MAX_PAGES + 1 : 1;

      if (startPage === 1) {
        aggregated.push(...firstPage.events);
      }

      for (
        let page = startPage === 1 ? 2 : startPage;
        page <= totalPages;
        page += 1
      ) {
        const { events: pageEvents } = await fetchEventsPage(page);
        aggregated.push(...pageEvents);
      }

      const truncated = totalPages > MAX_PAGES;
      setIsTruncated(truncated);
      if (truncated) {
        console.warn(
          `Events calendar truncated to the most recent ${
            MAX_PAGES * PAGE_SIZE
          } events out of ${totalPages * PAGE_SIZE} possible entries.`
        );
      }

      const uniqueEvents = Array.from(
        new Map(aggregated.map((event) => [event.id, event])).values()
      );

      setEvents(uniqueEvents);
    } catch (fetchError: any) {
      console.error("Failed to load calendar events:", fetchError);
      setError(
        fetchError?.message || "Failed to load events. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  }, [api, fetchEventsPage]);

  useEffect(() => {
    if (!api) {
      return;
    }

    fetchAllEvents();
  }, [api, fetchAllEvents]);

  const handleEventUpdated = useCallback(async () => {
    await fetchAllEvents();
  }, [fetchAllEvents]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const startA = new Date(a.start).getTime();
      const startB = new Date(b.start).getTime();
      return startA - startB;
    });
  }, [events]);

  const hasError = Boolean(error);
  const isEmpty = !isLoading && !hasError && sortedEvents.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <PageTitle title="Events Calendar" />
            <Button asChild variant="outline">
              <Link href="/events">Back to Events</Link>
            </Button>
          </div>

          {isTruncated && !hasError && !isLoading && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              Showing the most recent {MAX_PAGES * PAGE_SIZE} events. Narrow
              your filters if you need to view older history.
            </div>
          )}

          {hasError ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : isLoading ? (
            <LoadingContainer fullHeight />
          ) : (
            <div className="rounded-lg border border-border bg-background shadow-sm">
              {isEmpty ? (
                <div className="flex h-[400px] flex-col items-center justify-center gap-2 text-muted-foreground">
                  <span className="text-base font-medium">
                    No events scheduled yet.
                  </span>
                  <span className="text-sm">
                    Create an event from the Events page to see it here.
                  </span>
                </div>
              ) : (
                <MotiveCalendar
                  events={sortedEvents}
                  deliverables={[]}
                  onEventDrop={handleEventUpdated}
                  onEventResize={handleEventUpdated}
                  showFilterControls
                  showVisibilityControls
                  style={{
                    minHeight: "700px",
                    height: "calc(100vh - 220px)",
                    border: "none",
                    overflow: "hidden",
                  }}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
