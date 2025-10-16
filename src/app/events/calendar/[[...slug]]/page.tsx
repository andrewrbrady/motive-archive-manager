"use client";

import {
  use as usePromise,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { View, NavigateAction } from "react-big-calendar";
import { MotiveCalendar } from "@/components/calendar";
import { Button } from "@/components/ui/button";
import { LoadingContainer, LoadingSpinner } from "@/components/ui/loading";
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

const PAGE_SIZE = 200;
const MAX_PAGES = 20; // Up to 4,000 events total
const BASE_CALENDAR_PATH = "/events/calendar";

const SUPPORTED_VIEWS: View[] = ["month", "week", "work_week", "day", "agenda"];

const isSupportedView = (view: string | null): view is View =>
  !!view && (SUPPORTED_VIEWS as string[]).includes(view);

const normalizeDateForView = (input: Date, view: View): Date => {
  const normalized = new Date(input);
  normalized.setHours(0, 0, 0, 0);

  if (view === "month") {
    normalized.setDate(1);
  }

  return normalized;
};

const parseDateFromSlug = (slug: string[]): { date: Date | null; isValid: boolean } => {
  if (slug.length === 0) {
    return { date: null, isValid: true };
  }

  const [yearStr, monthStr, dayStr] = slug;
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    return { date: null, isValid: false };
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { date: null, isValid: false };
  }

  const day = dayStr ? Number(dayStr) : 1;

  if (dayStr && (!Number.isInteger(day) || day < 1 || day > 31)) {
    return { date: null, isValid: false };
  }

  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);

  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1) {
    return { date: null, isValid: false };
  }

  return { date: parsed, isValid: true };
};

const deriveStateFromUrl = (
  slug: string[],
  viewParam: string | null
): { date: Date; view: View; slugValid: boolean } => {
  const { date: parsedDate, isValid: slugValid } = parseDateFromSlug(slug);

  let view: View = "month";

  if (isSupportedView(viewParam)) {
    view = viewParam;
  } else if (!viewParam && slug.length >= 3) {
    // If a day is present but no explicit view, default to day view
    view = "day";
  }

  const baseDate = parsedDate ?? new Date();
  const normalized = normalizeDateForView(baseDate, view);

  return { date: normalized, view, slugValid };
};

const buildSlugFromDate = (date: Date, view: View): string[] => {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const slug = [year, month];

  if (view !== "month") {
    const day = String(date.getDate()).padStart(2, "0");
    slug.push(day);
  }

  return slug;
};

type EventsCalendarPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export default function EventsCalendarPage({ params }: EventsCalendarPageProps) {
  const resolvedParams = usePromise(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const api = useAPI();

  const slugSegments = resolvedParams?.slug ?? [];
  const slugKey = slugSegments.join("/");
  const viewParam = searchParams?.get("view") ?? null;
  const searchParamString = searchParams?.toString() ?? "";

  const urlState = useMemo(
    () => deriveStateFromUrl(slugSegments, viewParam),
    [slugKey, viewParam]
  );

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(urlState.date);
  const [currentView, setCurrentView] = useState<View>(urlState.view);

  const fetchAllEvents = useCallback(async () => {
    if (!api) {
      throw new Error("Authentication required");
    }

    const aggregated: Event[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= MAX_PAGES) {
      const search = new URLSearchParams();
      search.set("page", page.toString());
      search.set("pageSize", PAGE_SIZE.toString());

      const response = (await api.get(
        `events?${search.toString()}`
      )) as EventsApiResponse | Event[];

      let pageEvents: Event[] = [];
      let pagination: EventsApiResponse["pagination"] | undefined;

      if (Array.isArray(response)) {
        pageEvents = response;
      } else {
        pageEvents = response.events ?? [];
        pagination = response.pagination;
      }

      aggregated.push(...pageEvents);

      if (!pagination) {
        break;
      }

      totalPages = pagination.totalPages ?? totalPages;
      page += 1;
    }

    if (totalPages > MAX_PAGES) {
      console.warn(
        `Events calendar truncated to ${MAX_PAGES * PAGE_SIZE} events (total pages reported: ${totalPages}).`
      );
    }

    const uniqueEvents = Array.from(
      new Map(aggregated.map((event) => [event.id, event])).values()
    );

    const truncated = totalPages > MAX_PAGES;

    return { events: uniqueEvents, truncated };
  }, [api]);

  useEffect(() => {
    if (!api) return;

    let isCancelled = false;

    setIsLoading(true);
    setError(null);
    setIsTruncated(false);

    fetchAllEvents()
      .then(({ events: fetchedEvents, truncated }) => {
        if (isCancelled) return;
        setEvents(fetchedEvents);
        setIsTruncated(truncated);
      })
      .catch((fetchError: any) => {
        if (isCancelled) return;
        console.error("Failed to load calendar events:", fetchError);
        setError(
          fetchError?.message || "Failed to load events. Please try again later."
        );
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [api, fetchAllEvents]);

  const updateUrl = useCallback(
    (nextDate: Date, nextView: View) => {
      const normalizedDate = normalizeDateForView(nextDate, nextView);
      const slug = buildSlugFromDate(normalizedDate, nextView);
      const paramsCopy = new URLSearchParams(searchParamString);

      if (nextView === "month") {
        paramsCopy.delete("view");
      } else {
        paramsCopy.set("view", nextView);
      }

      const queryString = paramsCopy.toString();
      const nextPath =
        BASE_CALENDAR_PATH + (slug.length ? `/${slug.join("/")}` : "");
      const nextHref = `${nextPath}${queryString ? `?${queryString}` : ""}`;
      const currentHref = `${pathname}${
        searchParamString ? `?${searchParamString}` : ""
      }`;

      if (nextHref === currentHref) {
        return;
      }

      router.replace(nextHref, { scroll: false });
    },
    [pathname, router, searchParamString]
  );

  useEffect(() => {
    if (!urlState.slugValid && slugSegments.length > 0) {
      updateUrl(urlState.date, urlState.view);
      return;
    }

    const normalizedUrlDate = normalizeDateForView(urlState.date, urlState.view);
    const normalizedCurrentDate = normalizeDateForView(
      currentDate,
      currentView
    );

    if (currentView !== urlState.view) {
      setCurrentView(urlState.view);
    }

    if (normalizedCurrentDate.getTime() !== normalizedUrlDate.getTime()) {
      setCurrentDate(normalizedUrlDate);
    }
  }, [urlState, slugSegments.length, updateUrl, currentDate, currentView]);

  const handleViewChange = useCallback(
    (newView: View) => {
      const normalized = normalizeDateForView(currentDate, newView);
      setCurrentView((prev) => (prev === newView ? prev : newView));
      setCurrentDate((prev) =>
        prev.getTime() === normalized.getTime() ? prev : normalized
      );
      updateUrl(normalized, newView);
    },
    [currentDate, updateUrl]
  );

  const handleNavigate = useCallback(
    (date: Date, view: View, _action?: NavigateAction) => {
      const normalized = normalizeDateForView(date, view);
      setCurrentDate((prev) =>
        prev.getTime() === normalized.getTime() ? prev : normalized
      );
      updateUrl(normalized, view);
    },
    [updateUrl]
  );

  const handleEventUpdated = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { events: refreshedEvents, truncated } = await fetchAllEvents();
      setEvents(refreshedEvents);
      setIsTruncated(truncated);
    } catch (refreshError: any) {
      console.error("Failed to refresh calendar events:", refreshError);
      setError(
        refreshError?.message || "Failed to refresh events. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
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
  const showInitialLoading = isLoading && events.length === 0;
  const isRefreshing = isLoading && events.length > 0;

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
          ) : showInitialLoading ? (
            <LoadingContainer fullHeight />
          ) : (
            <div className="relative rounded-lg border border-border bg-background shadow-sm">
              {isRefreshing && (
                <div className="pointer-events-none absolute inset-0 flex justify-end p-4">
                  <div className="flex items-center gap-2 rounded-md bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm">
                    <LoadingSpinner size="sm" />
                    <span>Refreshing…</span>
                  </div>
                </div>
              )}
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
                  currentDate={currentDate}
                  currentView={currentView}
                  onViewChange={handleViewChange}
                  onNavigate={handleNavigate}
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
